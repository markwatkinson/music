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
    
    this.subscribeFunc = function(currentPos) {
        var currentLength = self.playlist.songs().length,
            fromEnd = currentLength - currentPos,
            threshhold = self.songsPerPlaylist/2,
            toAdd;
        if (fromEnd >= threshhold) {
            return;
        }
        
        if (self.lock) return;
        self.lock = true;
        if (self.songSubscription !== null) {
            self.songSubscription.dispose();
        }

        toAdd = -1 * (fromEnd - threshhold);
        console.log('adding', toAdd);

        self.collection.getRandomSongs(toAdd, function(songs_) {
            var songs, newLength = currentLength + toAdd;
            songs = self.playlist.songs();
            if (newLength > self.songsPerPlaylist)
                songs = songs.slice(newLength - self.songsPerPlaylist);
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