"use strict";
window.ArtistModel = function(data) {
    Model.call(this);
    this.name = ko.observable('');
    this.albums = ko.observableArray([]);
    this.loading = false;
    this.albumsLoaded = false;
    
    this.url = '';
    
    this.attrs(['name', 'albums', 'url']);
    this.setOverride({
        albums: function(albums) {
            var self = this;
            music.utils.each(albums, function(i, e) {
                self.addAlbum(e);
            });
        }
    });
    this.set(data);
}

ArtistModel.prototype = new Model();
ArtistModel.prototype.constructor = ArtistModel;

ArtistModel.prototype.build = function(data) {
    var self = this;
    this.name(data.name);
    music.utils.each(data.albums, function(i, albumData) {
        var title = albumData.title, 
            index = music.utils.search(self.albums, function(a) {
                return a.title() === title;
            }),
            album;
        if (index > -1) {
            album = self.albums[i];
        } else {
            album = new AlbumModel();
        }
        album.set(albumData);
        self.addAlbum(album);
    });
}

ArtistModel.prototype.addAlbum = function(data) {
    var album = data instanceof AlbumModel? data : new AlbumModel(data);
    album.set({artist : this});
    this.albums.push(album);
}


ArtistModel.prototype.loadChildren = function(complete) {
    var self = this,
        path = music.paths.data + this.path();
    
    if (complete) {
        this.addLoadCallback(complete);
    }
    if (this.loading) return;
    
    music.utils.getJSON(path, function(data) {
        var waiting = 0, fetched=0;
        if (!data.artists || !data.artists.length || !data.artists[0].albums) {
            return;
        }
        
        music.utils.each(data.artists[0].albums, function(i, albumData) {
            var title = albumData.title, 
                index = music.utils.search(self.albums(), function(a) {
                    return a.title() == title;
                }),
                album;
            if (index > -1) {
                album = self.albums()[index];
                album.set(albumData);
            } else {
                self.addAlbum(albumData);
            }
        });
        self.albums.sort(function(a, b) { return a.title().localeCompare(b.title()) });
        if (self.albums().length == 0) {
            if (complete) complete(self.albums());
        } else {
            waiting = self.albums().length;
            music.utils.each(self.albums(), function(i, e) {
                e.loadChildren(function() {
                    fetched++;
                    if (fetched == waiting) {
                        self.loaded(true);
                        self.loading = false;
                    }
                });
            });
        }
    });
}


ArtistModel.prototype.path = function() {
    return this.url;
}