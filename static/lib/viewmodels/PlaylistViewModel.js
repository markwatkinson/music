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
        ignoreIndex = false,
        sortBy = null;

    this.songs = ko.observableArray([]);
    this.random = ko.observable(false);
    this.repeat = ko.observable(false);
    
    this.playing = ko.observable(false);
    this.paused = ko.observable(false);
    this.index = ko.observable(-1);
    
    this.sortBy = ko.computed({
        read: function(){ return sortBy; },
        write: function(field) {
            var lastField = sortBy,
                sortCmp = comparators[field], currentSong = this.currentSong();
            
            if (sortCmp) {
                sortBy = field;
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
        var index = 0;
        sortBy = null;
        if (typeof autoPlay === 'undefined') autoPlay = true;
        if (obj instanceof SongModel) {
            self.songs.push(obj);
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
    

    this.removeIndex = function(index) {
        
    }
    
    this.play = function() {
        if (this.index() < 0 && !this.playing()) {
            this.next();
        }
        this.playing(true);
        audioElement.play();
    }.bind(this);
    
    this.playIndex = function(index) {
        this.stop();
        this.index(index);
        this.play();
    }
    
    this.stop = function() {
        audioElement.pause();
        this.currentSrc('');
        this.playing(false);
    }.bind(this);
    
        
    
    audioElement.addEventListener('ended', function() {
        console.log('ended playback');
        self.next();
    }, false);
    audioElement.addEventListener('durationchange', function() {
        
    }, false);
    
    
    
}