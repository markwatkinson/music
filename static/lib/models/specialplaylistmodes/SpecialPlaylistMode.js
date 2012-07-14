"use strict";
window.SpecialPlaylistMode = function(collection, playlist) {
    this.playlist = playlist;
    this.collection = collection;
    this.description = '';

    this.randomable = true;
    this.repeatable = true;
    this.savable = true;
    this.explicitCancel = false;
    
    // playlist lock
    //  TODO observe this in the playlistmodel
    this.lock = false;
}

SpecialPlaylistMode.prototype.start = function() {
    if (!this.randomable)
            this.playlist.random(false);
    if (!this.repeatable)
        this.playlist.repeat(false);
}
SpecialPlaylistMode.prototype.stop = function() {
}
        

window.SpecialPlaylistModeDefault = function(collection, playlist) {
    SpecialPlaylistMode.call(this, collection, playlist);
}

SpecialPlaylistModeDefault.prototype = new SpecialPlaylistMode();
SpecialPlaylistModeDefault.prototype.constructor = SpecialPlaylistModeDefault;



window.SpecialPlaylistModeDynamicRandom = function(collection, playlist) {
    var self = this;
    self.songsPerPlaylist = 20;
    SpecialPlaylistMode.call(this, collection, playlist);
    this.description = 'Dynamic Random';
    
    this.songSubscription = null;
    
    this.savable = false;
    this.repeatable = false;
    this.randomable = false;
    this.explicitCancel = true;
    
    this.reSubscribe = function() {
        self.songSubscription = self.playlist.currentIndex.subscribe(self.subscribeFunc);
    }
    
    this.subscribeFunc = function(newIndex) {
        
        var diff = self.songsPerPlaylist/2 - newIndex -1,
            remove = diff < 0,
            songs;
        console.log('diff', diff, self.lock);
            
        if (!remove) return;
        if (self.lock) return;
        self.lock = true;
        if (self.songSubscription !== null) {
            self.songSubscription.dispose();
        }
        if (newIndex < 0) {
            newIndex = 0;
        }
        diff *= -1;

        self.collection.getRandomSongs(diff, function(songs_) {
            songs = self.playlist.songs();
            songs = songs.slice(diff);
            self.playlist.songs(songs);
            ko.utils.arrayForEach(songs_, function(s) {
                self.playlist.add(s);
            });
            
            self.lock = false;
            self.reSubscribe();
            
        });
    }
    
    this.start = function() {
        SpecialPlaylistMode.prototype.start.call(self);
        self.playlist.songs([]);
        self.collection.getRandomSongs(self.songsPerPlaylist, function(songs_) {
            ko.utils.arrayForEach(songs_, function(s) {
                self.playlist.add(s);
            });
        });
        self.subscribeFunc(-1);
        self.reSubscribe();
    }
    this.stop = function() {
        SpecialPlaylistMode.prototype.stop.call(self);
        this.songSubscription.dispose();
    }
}



SpecialPlaylistModeDynamicRandom.prototype = new SpecialPlaylistMode();
SpecialPlaylistModeDynamicRandom.prototype.constructor = SpecialPlaylistModeDynamicRandom;