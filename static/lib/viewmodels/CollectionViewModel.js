"use strict";
window.CollectionViewModel = function() {
    var self = this,
        dragging = [];

    this.search = {
        term: '',
        threshold : 100,
        timer: null,
        active: false
    };

    // NOTE never reassign these arrays, make sure you operate on them directly.
    this.searchResults = [];
    this.collection = [];
    // they are referenced by the following
    this.artists = ko.observableArray([]);
    this.specialPlaylists = [
        // Knockout is too slow to deal with this so disable it for now
        //new AllTracksPlaylistModel({id: 'all', name: 'All tracks'})
        new DyanimicRandomPlaylistModel()
    ]
    
    
    this.searchTerm = ko.computed({
        read : function() { return self.search.term; },
        write: function(term) {
            console.log('search', term);
            var s, timerFunc, responseFunc;
            term = term.replace(/^\s+|\s+$|\//g, '');
            s = self.search;
            clearTimeout(s.timer);
            s.term = term;
            if (!term.length) {
                console.log('clearing');
                s.active = false;
                self.artists(self.collection);
            }
            else {
                // we're going to have to do all of this in the closure scope
                // to make sure we're responding to the most recent search
                timerFunc = function() {
                    // timer function. 
                    // This will get cancelled early if necessary
                    // so we don't have to worry about synchronicity here
                    music.utils.getJSON('search/' + term, responseFunc);
                }
            
                responseFunc = function(data) {
                    // response func is beyond our control, so if the state
                    // has changed, we need to discard this response.
                    // here's our check, not sure if this is sufficient
                    // for the general case, but should stop 99% of strange
                    // behaviour
                    if (s.term != term) { 
                        return;
                    }
                    // this safely empties the array, apparently
                    // http://stackoverflow.com/questions/1232040/how-to-empty-an-array-in-javascript
                    self.searchResults.length = 0;
                    music.utils.each(data.artists, function(i, e) {
                        var artist = new ArtistModel(e);
                        self.searchResults.push(artist);
                    });
                    self.searchResults.sort(function(a, b) {
                        return a.name().localeCompare(b.name());
                    });
                    self.artists(self.searchResults);
                    s.active = true;
                }
                
                s.timer = setTimeout(timerFunc, s.threshold);
            }
        },
        owner: this
    });


    this.toggleExpand = function(item) {
        if (self.search.active) {
            item.collectionData.toggleExpand();
        } else {
            item.loadChildren(function(newChildren) {
                item.collectionData.toggleExpand();
            });
        }
    }.bind(this);
    
    
    
    this.click = function(item) {
        this.clickData
    }
    
    // single and double click events for expanding the tree and 
    // adding to playlist
    music.utils.addClickHandler(this, function() {
        var item = this;
        self.toggleExpand(item);
    }, function() {
        var item = this;
        if (self.search.active) {
            music.root.playlistVM.playlist.add(item);
        } else {
            item.loadChildren(function() {
                music.root.playlistVM.playlist.add(item);
            })
        }
    });
    
    this.click = function(data, event) {
        event.stopPropagation();
        self.clickData.click.call(data, event);
        return false;
    }

    this.load = function(callback) {
        var path = music.paths.data, artist;
        
        music.utils.getJSON(path, function(data) {
            music.utils.each(data.artists, function(i, e) {
                artist = new ArtistModel(e);
                self.collection.push(artist);
            });
            self.collection.sort(function(a, b) { 
                return a.name().toLowerCase().localeCompare(b.name().toLowerCase());
            });
            self.artists(self.collection);
        });
    }
    
    this.getRandomSongs = function(number, action) {
        // NOTE we aren't merging the results into the tree because
        // I'm not sure there's a case where having a half-built node is
        // actually useful - if anyone expands it we want it to be full.
        music.utils.ajax('/gets/', {
            data: {random: true, number: number}, 
            type: 'post',
            success: function(data) {
                var songs = [];
                console.log('random songs', data);
                ko.utils.arrayForEach(data.artists, function(item) {
                    var artist = new ArtistModel(item);
                    ko.utils.arrayForEach(item.albums, function(item) {
                        var album = new AlbumModel(item) 
                        
                        ko.utils.arrayForEach(item.songs, function(item) {
                            var s = new SongModel(item);
                            album.addSong(s);
                            songs.push(s);
                        });
                        artist.addAlbum(album);
                    });
                    
                });
                action(songs);
            },
            error : function() {
                action([]);
            }
        });
    }

    this.drag = function(event, item) {
        console.log('dragging', item);
        event.stopPropagation();
        event.originalEvent.dataTransfer.setData('text/html', 'collection');
        dragging.length = 0;
        dragging.push(item);
    }
    
    
    this.doWithDraggedSpecial = function(action, elements) {
        ko.utils.arrayForEach(elements, function(e) {
            e.dragFunc(action);
        });
    }
    
    
    this.doWithDragged = function(action) {
        // this gives us a chance to wait for the node to load fully
        var waiting,
            f = function() {
                waiting--;
                if (waiting == 0) {
                    action(dragging);
                }
            }, 
            special = [],
            nonspecial = [];
        
        ko.utils.arrayForEach(dragging, function(item) {
            if (typeof item.dragFunc === 'function') {
                special.push(item);
            } else {
                nonspecial.push(item);
            }
        });
        
        self.doWithDraggedSpecial(action, special);
        waiting = nonspecial.length;
        
        if (!this.search.active && nonspecial.length) {
            music.utils.each(nonspecial, function(i, e) {
                e.loadChildren(f);
            });
        } else {
            // this is fully loaded already
            f();
        }
    }
}
