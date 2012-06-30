"use strict";
window.CollectionViewModel = function() {
    var self = this,
        clickTimer,
        lastClickTarget;

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
        var clickData = item.collectionData.clickData,
            time = +new Date(),
            threshold = 150,
            doubleClick = time - clickData.lastClick < threshold;
        if (doubleClick) {
            clickData.lastClick = 0;
            clearTimeout(clickData.timer);
            if (self.search.active) {
                music.root.playlist.addToPlaylist(item);
            } else {
                item.loadChildren(function() {
                    music.root.playlist.addToPlaylist(item);
                });
            }
        }
        else {
            clickData.timer = setTimeout(function() {
                self.toggleExpand(item);
                clickData.lastClick = 0;
            }, threshold);
            clickData.lastClick = time;
        }
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
}
