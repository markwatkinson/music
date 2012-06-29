"use strict";
window.PlaylistViewModel = function() {
    var self = this, 
        audioElement = document.getElementById('current-audio');

    this.songs = ko.observableArray([]);
    this.random = ko.observable(false);
    this.repeat = ko.observable(false);
    
    this.playing = ko.observable(false);
    this.paused = ko.observable(false);
    this.index = ko.observable(-1);
    
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
        var song = this.songs()[this.index()];
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