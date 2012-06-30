"use strict";
window.AlbumModel = function(data) {
    Model.call(this);
    
    this.title = ko.observable('');
    this.artist = new ArtistModel();
    this.year = ko.observable('');
    this.songs = ko.observableArray([]);
    
    this.url = '';
    
    this.songsLoaded = false;
    
    this.attrs(['title', 'artist', 'year', 'songs', 'url']);
    this.attrTypes({artist: ArtistModel});
    this.setOverride({
        songs: function(songs) {
            var self = this;
            music.utils.each(songs, function(i, e) { self.addSong(e); })
        }
    });
    this.set(data);
}


AlbumModel.prototype = new Model();
AlbumModel.prototype.constructor = AlbumModel;

AlbumModel.prototype.addSong = function(args /* variadic */) {
    var s, data, i;

    for (i=0; i<arguments.length; i++) {
        data = arguments[i];
        if (data instanceof SongModel) {
            s = data;
        } else {
            s = new SongModel();
            delete s.album;
            s.set(data);
        }
        s.set({album: this});
        this.songs.push(s);
    }
}

AlbumModel.prototype.addSongs = function(songs) {
    this.addSong.apply(this, songs);
}


AlbumModel.prototype.loadChildren = function(complete) {
    var self = this,
    path = music.paths.data + this.path();
    
    if (this.songsLoaded) {
        complete();
        return;
    }
    this.songsLoaded = true;

    music.utils.getJSON(path, function(data) {
        if (!data.artists || !data.artists.length || !data.artists[0].albums)
            return;
        if (!data.artists[0].albums.length) 
            return;
        
        music.utils.each(data.artists[0].albums[0].songs, function(i, songData) {
            var title = songData.title,
                index = music.utils.search(self.songs(), function(s) {
                    return s.title() == title;
                }),
                song;
            if (index > -1) {
                song = self.songs()[index];
                song.set(songData);
            } else {
                self.addSong(songData);
            }
        });
        self.songs.sort(function(a, b) {
            var cmp = a.trackNo() - b.trackNo();
            return (cmp === 0)? cmp : (cmp<0? -1 : 1);
        });
        if (complete) complete(self.songs());
    });
}


AlbumModel.prototype.path = function() {
    return this.artist.path() + '/' + this.url;
}