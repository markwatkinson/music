"use strict";
(function() {
    // private variables
    var sortByField = null,
        seekPoller = null,
        currentSong;
    
    
    // utility functions
    var addPlaylistData = function(object) {
        if (object instanceof SongModel) {
                object.playlistData = { 
                    selected: ko.observable(false),
                    playing: ko.observable(false)
                }
            } 
        },
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
    };
    
    
    
    window.PlaylistModel = function(audioElement) {
        var self = this;
        this.name = ko.observable('Default');
        this.syncing = ko.observable(false);
        
        this.songs = ko.observableArray([]);
        this.random = ko.observable(false);
        this.repeat = ko.observable(false);
        
        this.playing = ko.observable(false);
        this.paused = ko.observable(false);
        
        this.seekPos = ko.observable(0);
        
        this.currentSong = ko.observable();
        
        this.sortBy = ko.computed({
            read: function() { return sortByField; },
            write: function(field) {
                var cmp = comparators[field], lastField = sortByField;
                if (cmp) {
                    if (lastField === field) { self.songs.reverse(); }
                    else { self.songs.sort(cmp); }
                    
                    sortByField = field;
                }
            }
        });
        
        this.currentIndex = ko.computed(function() {
            var index = 0, 
                songs = self.songs(),
                cs = self.currentSong();
            if (!cs) {
                return -1;
            }
            for (index; index < songs.length; index++) {
                if (cs === songs[index]) {
                    return index;
                }
            }
            return -1;
        });
        

        this.currentSongLength = ko.computed(function() {
            var s = self.currentSong();
            return s? s.length() : 0;
        });
        
        this.currentSource = ko.computed(function() {
            var s = self.currentSong();
            return (s && self.playing())? ('play/' + s.path()) : '';
        });

        
        this.play = function(s) {
            var currentSong = self.currentSong();
            if (s) {
                s.playlistData.playing(true);
                if (currentSong)
                    currentSong.playlistData.playing(false);
                self.currentSong(s);
            }
            self.playing(true);
            self.paused(false);
            audioElement.play();
        }
        this.playIndex = function(index) {
            var s = self.songs()[index];
            if (s) self.play(s);
        }
        this.stop = function() {
            self.playing(false);
        }
        this.pause = function() {
            self.paused(true);
            audioElement.pause();
        }
        
        this.next = function() {
            var index = self.currentIndex(), nextIndex, nextSong;
            nextIndex = index + 1;
            // TODO random
            console.log('next', index);
            if (index > -1) {
                nextSong = self.songs()[nextIndex];
                if (nextSong)
                    self.play(nextSong);
                else self.stop();
            }
        }
        
        
        // try not to use this directly - see add
        this.addSong = function(song) {
            var s = song.clone();
            addPlaylistData(s);
            self.songs.push(s);
        }
        
        // try not to use this directly - see add
        this.addAlbum = function(album) {
            ko.utils.arrayForEach(album.songs(), function(s_) {
                self.addSong(s_);
            });
        }
        // try not to use this directly - see add
        this.addArtist = function(artist) {
            ko.utils.arrayForEach(artist.albums(), function(a_) {
                    self.addAlbum(a_);
            });
        }
        
        this.add = function(object, autoplay) {
            if (typeof autoplay === 'undefined') autoplay = true;
            // we only deal with songs so if it's a container (i.e. an artist or
            // album) then we'll recurse down to songs
            if (object instanceof SongModel) {
                self.addSong(object);
            } else if (object instanceof AlbumModel) {
               self.addAlbum(object);
            } else if (object instanceof ArtistModel) {
                self.addArtist(object);
            } else {
                debugger;
            }
            this.save();
        }
        
        this.clear = function() {
            self.songs([]);
            self.save();
        }
        
        this.remove = function(selector) {
            if (selector instanceof SongModel) {
                self.songs.remove(function(s) {
                    // note this is a reference comparison and not a content
                    // equality comparison
                    return selector === s;
                });
            }
            else if (typeof selector === 'function') {
                // caller supplied filtering
                self.songs.remove(selector);
            }
            this.save();
        }
        
        
        
        seekPoller = setInterval(function() {
            var currentSong;
            
            if (!self.playing()) return;

            currentSong = self.currentSong();
            
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
        }, 500);
        
        
        this.save = function(name) {
            var path;
            // queue the save operation
            if (self.syncing()) {
                console.log('queueing save');
                var s = self.syncing.subscribe(function(newVal) {
                    if (!newVal) self.save();
                    s.dispose();
                });
                return;
            }
            self.syncing(true);
            console.log('saving');
            if (typeof name !== 'undefined' && self.name() !== name) {
                self.name(name);
            }
            path = 'playlist/save/';
            $.post(path, {name: self.name(), playlist: ko.toJSON(self)},
                function() { self.syncing(false); }
            );
        }
        
        this.load = function(name) {
            // loads from the server
            // TODO name shouldn't have to be pre-set but putting it as an arg
            // breaks things with the way the template calls this func.
            var path, name;
            if (self.syncing()) {
                console.log('queueing load');
                // I'm not sure if it makes more sense to queue this or to just
                // drop it if a sync operation is already in progress
                var s = self.syncing.subscribe(function(newVal) {
                    if (!self.syncing()) self.load();
                    s.dispose();
                });
                return;
            }
            self.syncing(true);
            console.log('loading');
            name = name || self.name();
            path = '/playlist/get/' + encodeURIComponent(name) + '?' + (+new Date);
            
            console.log('ajax...');
            music.utils.ajax(path, {
                error: function() {
                    console.log('fail');
                    self.syncing(false);
                    
                },
                success: function(data, textStatus) {
                    var json = data;
                    var key, value;
                    var songs = [], uids = [];
                    console.log('success', textStatus);
                    self.stop();
                    
                    // we only really care about these, I think.
                    self.name(json.name);
                    self.random(json.random);
                    self.repeat(json.repeat);

                    // now we're going to bring in the song data
                    music.utils.each(json.songs, function(i, e) {
                        uids.push(e.uid);
                    });
                    music.utils.ajax('gets/', {
                        type: 'post',
                        data: {uids: JSON.stringify(uids)},
                        error: function() { self.syncing(false); },
                        success:  function(data, textStatus) {
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
                            self.syncing(false);
                        }
                    });
                }
            });
        }
    }
}());