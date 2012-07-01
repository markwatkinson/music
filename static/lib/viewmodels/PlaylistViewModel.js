"use strict";
window.PlaylistViewModel = function() {
    var self = this, 
        audioElement = document.getElementById('current-audio'),
        comparators = {
            // these all operate on song objects apart from cmp which operates
            // on anything the < and > operators are defined for, so it's
            // basically a primtive cmp
            cmp : function(a, b) {
                if (a < b) return -1;
                if (a > b) return 1;
                return 0;
            },
            trackNo: function(a, b) {
                return comparators.cmp(a.trackNo(), b.trackNo())
            },
            title: function(a, b) {
                return comparators.cmp(a.title(), b.title());
            },
            
            
            artist: function(a, b) {
                // artist calls album
                var c = comparators.cmp(a.album.artist.name(),
                                        b.album.artist.name())
                if (c == 0) {
                    c = comparators.album(a, b)
                }
                return c;
            },
            album: function(a, b) {
                // album calls trackNo
                var c = comparators.cmp(a.album.title(),
                                        b.album.title());
                if (c == 0) {
                    c = comparators.trackNo(a, b);
                }
                return c;
            },
            year: function(a, b) {
                // year calls artist
                var c = comparators.cmp(a.album.year(), b.album.year());
                if (c == 0) {
                    c = comparators.artist(a, b);
                }
                return c;
            },
            length: function(a, b) {
                var c = comparators.cmp(a.length(), b.length());
                if (c == 0) {
                    c = comparators.artist(a, b);
                }
                return c;
            }
        },
        addPlaylistData = function(obj) {
            if (obj instanceof SongModel) {
                obj.playlistData = { 
                    selected: ko.observable(false)
                }
            }
        },
        ignoreIndex = false,
        seekPoller = null;
        
    this._sortBy = null;
        
    this.name = ko.observable('Default');
    
    // dummy variable, referenced by seek() to trigger an update
    this.seekPos = ko.observable(0);

    this.songs = ko.observableArray([]);
    this.random = ko.observable(false);
    this.repeat = ko.observable(false);
    
    this.playing = ko.observable(false);
    this.paused = ko.observable(false);
    this.index = ko.observable(-1);
    
    this.sortBy = ko.computed({
        read: function(){ return self._sortBy; },
        write: function(field) {
            var lastField = self._sortBy,
                sortCmp = comparators[field], currentSong = this.currentSong();
            
            if (sortCmp) {
                self._sortBy = field;
                if (lastField === field) {
                    self.songs.reverse();
                } else {
                    self.songs.sort(sortCmp);
                }
            }
            // now we've just changed the order, so we need to make sure
            // the index is updated to match the current playing song
            if (currentSong) {
                music.utils.each(this.songs(), function(i, e) {
                    if (e == currentSong) {
                        ignoreIndex = true;
                        self.index(i);
                        ignoreIndex = false
                        return true;
                    }
                });
            }
        },
        owner: this
    });
    
    this.paused = ko.observable(false);

    // read by the <audio> element
    this.currentSrc = ko.observable('');
    
    this.currentSong = ko.computed(function() {
        return self.songs()[self.index()];
    });
    this.currentSongLength = ko.computed(function() {
        var s = self.currentSong();
        return s? s.length : 0;
    });
    
    
    this.index.subscribe(function() {
        var song;
        if (ignoreIndex) 
            return;
        song = this.songs()[this.index()];
        if (!song) {
            this.playing(false);
            return;
        }
        this.currentSrc('play/' + song.path());
        if (this.playing()) this.play();
    }.bind(this));
    
    this.next = function() {
        var index = this.index();
        index++;
        this.index(index);
    }.bind(this);
    
    this.addToPlaylist = function(obj, autoPlay) {
        var index = 0, s;
        self._sortBy = null;
        if (typeof autoPlay === 'undefined') autoPlay = true;
        if (obj instanceof SongModel) {
            s = obj.clone();
            addPlaylistData(s);
            self.songs.push(s);
            index = self.songs().length;
        } else if (obj instanceof AlbumModel) {
            music.utils.each(obj.songs(), function(i, e) {
                self.addToPlaylist(e, false);
            });
        } else if (obj instanceof ArtistModel) {
            music.utils.each(obj.albums(), function(i, e) {
                self.addToPlaylist(e, false);
            });
        }
        else { console.log('what is obj?') }
        if (autoPlay && !this.playing()) {
            this.playIndex(index);
        }
    }
    
    this.dragStart = function(event, item) {
        // why is this on originalEvent?!
        // I thought this was only added by jquery but jquery should not be 
        // involved in this event...
        event.originalEvent.dataTransfer.setData('text/html', null); 
        console.log('Drag', event);
        return true;
    }
    
    
    this.drop = function(event) {
        var source = event.originalEvent.dataTransfer.getData('text/html'),
            items;
        if (source == 'collection') {
            items = music.root.collection.doWithDragged(function(items) {
                music.utils.each(items, function(i, e) {
                    self.addToPlaylist(e);
                });
            });
        }
        console.log('drop received from', source);
    }
    

    this.removeIndex = function(index) {
        
    }
    
    this.clear = function() {
        self.songs.removeAll();
    }
    
    
    this.play = function() {
        
        if (this.index() < 0 && !this.playing()) {
            this.next();
        }
        console.log('play');
        this.playing(true);
        this.paused(false);
        audioElement.play();
        clearInterval(seekPoller);
        seekPoller = setInterval(function() {
            var currentSong = self.currentSong();
            self.seekPos(audioElement.currentTime);
            
            
            // for some reason Chrome isn't firing the ended event, 
            // audioElement.ended === false always, and audioElement.duration is
            // infinity. on Firefox, duration increases incrementally
            // It may be because the flask server is serving media as HTTP 200 
            // instead of 206 (partial content). In any case, until one party
            // starts handling things differently, we have to look at the 
            // song's metadata and hope it was correct
            // This is risky because song metadata can be wrong.
            if (audioElement.ended || !currentSong || 
                    self.seekPos() >= self.currentSong().length()) {
                self.next();
            }
        }, 500)
    }.bind(this);
    
    this.playIndex = function(index) {
        this.stop();
        this.index(index);
        this.play();
    }
    
    this.pause = function() {
        audioElement.pause();
        this.paused(true);
    }
    
    this.stop = function() {
        var src = this.currentSrc();
        audioElement.pause();
        this.currentSrc('');
        this.currentSrc(src);
        this.playing(false);
        clearInterval(seekPoller);
        this.seekPos(0);
    }.bind(this);

    this.seek = ko.computed({
        read: function() {
            return this.seekPos();
        },
        write: function(value) {
            value = Math.round(value);
            this.seekPos(value);
            audioElement.currentTime = value;
            console.log('seekng to', value);
        },
        owner: this
    });
    
    
    
    this.selection = {
        cursor: -1,
        lastCtrl : false,
        lastShift: false,
        
        
        clear: function() {
            music.utils.each(self.songs(), function(i, s) {
                s.playlistData.selected(false);
            });
        },
        setIndex: function(index, value) {
            var s = self.songs()[index];
            if (!s) return;
            s.playlistData.selected(value);
        },
        toggleIndex: function(index) {
            var s = self.songs()[index];
            if (!s) return;
            s.playlistData.selected(!s.playlistData.selected());
        },
        
        range : function(index1, index2) {
            var tmp, s;
            if (index1 > index2) {
                tmp = index1;
                index1 = index2;
                index2 = tmp;
            }
            while(index1 <= index2) {
                s = self.songs()[index1];
                if (!s) break;
                s.playlistData.selected(true);
                index1++;
            }
        },
        
        // click handler
        click : function(event, index) {
            var sel = self.selection;
            console.log(event);
            if (event.ctrlKey) {
                sel.toggleIndex(index);
                sel.lastCtrl = true;
                sel.lastShift = false;
                sel.cursor = index;
            } else if (event.shiftKey) {
                if (sel.lastShift) {
                    sel.clear();
                }
                if (sel.cursor < 0) sel.cursor = 0;
                sel.range(sel.cursor, index);
                sel.lastCtrl = false;
                sel.lastShift = true
                
                
            } else {
                sel.clear();
                sel.setIndex(index, true);
                sel.lastCtrl = false;
                sel.lastShift = false;
                sel.cursor = index;
            }
        },
        
        remove : function() {
            self.songs.remove(function(s) {
                return s.playlistData.selected();
            });
        },

        // FIXME this is hijacking everything, e.g. f5 doesn't work.
        keyPress: function(event) {
            var k = event.keyCode,
                sel = self.selection,
                handled = false;
            
            switch(k) {
                // delete
                case 46:
                    sel.remove();
                    handled = true;
                    break;
                // up arrow
                case 38:
                    sel.clear();
                    sel.cursor = Math.max(sel.cursor-1, 0);
                    sel.setIndex(sel.cursor, true);
                    handled = true;
                    break
                // down arrow
                case 40:
                    sel.clear();
                    sel.cursor = Math.min(sel.cursor+1, self.songs().length-1);
                    sel.setIndex(sel.cursor, true);
                    handled = true;
                    break;
                
                case 13: // enter
                case 32: // space
                    self.playIndex(sel.cursor);
                    handled = true;
                    break;
            }
            console.log(k, handled);
            return handled;
        }
    };

    
    this.selectToggleIndex = function(index) {
        var s = self.songs()[index];
        if (!s) return;
        s.playlistData.selected(!s.playlistData.selected());
    }
    
    
    
    this.save = function() {
        var path = 'playlist/save/';
        $.post(path, {name: self.name(), playlist: ko.toJSON(self)});
    }
    
    this.load = function() {
        // loads from the server
        // TODO name shouldn't have to be pre-set but putting it as an arg
        // breaks things with the way the template calls this func. 
        var path, name;
        name = name || self.name();
        path = '/playlist/get/' + encodeURIComponent(name) + '?' + (+new Date);
        console.log(path, self.name());
        
        music.utils.getJSON(path, function(data) {
            var json = data;
            var key, value;
            var songs = [], uids = [];
            
            self.stop();
            
            // we only really care about these, I think.
            self.name(json.name);
            self.random(json.random);
            self.repeat(json.repeat);
            self.index(json.index);
            self.currentSrc(json.currentSrc);
            
            // now we're going to bring in the song data
            music.utils.each(json.songs, function(i, e) {
                uids.push(e.uid);
            });
            
            $.post('gets/', {uids: JSON.stringify(uids)}, function(data, textStatus) {
                //data contains the JSON object
                //textStatus contains the status: success, error, etc
                // TODO think this func needs to handle its own HTTP errors
                var artist, album, song, artists = [];
                
                
                music.utils.each(data.artists, function(i, e) {
                    artist = new ArtistModel(e);
                    artists.push(artist);
                });
                music.utils.each(artists, function(i, artist) {
                    music.utils.each(artist.albums(), function(i, album) {
                        music.utils.each(album.songs(), function(i, song) {
                            addPlaylistData(song);
                            songs.push(song);
                        });
                    });
                });
                self.songs(songs);
            }, 'json');
        });
    }


}