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
                self.play(nextSong);
            }
        }
        
        this.add = function(object, autoplay) {
            var s;
            if (typeof autoplay === 'undefined') autoplay = true;
            // we only deal with songs so if it's a container (i.e. an artist or
            // album) then we'll recurse down to songs
            console.log('adding', object);
            if (object instanceof SongModel) {
                s = object.clone();
                addPlaylistData(s);
                self.songs.push(s);
            } else if (object instanceof AlbumModel) {
                ko.utils.arrayForEach(object.songs(), function(s_) {
                    self.add(s_, false);
                });
            } else if (object instanceof ArtistModel) {
                ko.utils.arrayForEach(object.albums(), function(a_) {
                    self.add(a_, false);
                });
            } else {
                debugger;
            }
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
        
        
        
        

    }
}());