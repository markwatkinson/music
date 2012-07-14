"use strict";
var music;
(function($) {
    var pathRoot = 'static/';
    
    window.music = {
        
        // our root viewmodel/controller
        // set below
        root : null,
 
        utils: {},
        
        paths : {
            templates: pathRoot + 'lib/views/',
            models: pathRoot + 'lib/models/',
            viewmodels : pathRoot + '/lib/viewmodels/',
            data: 'get/',
            audio: 'play/'
        },
 
        templates : {
            'collection' : 'collection.html',
            'playlist' : 'playlist.html',
            'playlist-grid' : 'playlist-grid.html'
        },

        
    }
    
    
    // currently we just alias a few jquery methods
    // in case we decide to lose jquery at a future date -
    // it keeps jquery out of the core
    window.music.utils = {
        ajax : function(path, data) {
            data = $.extend({
                cache: false,
                dataType: 'json',
            }, data || {});
            return $.ajax(path, data);
        },
        getJSON : $.getJSON,
        each : $.each,
        formatPath : function(s) {
            s = s.replace(/[^\w_]+/g, '-');
            s = s.replace(/--+/g, '-');
            s = s.replace(/-^|-$/g, '');
            return s.toLowerCase();
        },
        
        search: function(collection, selectFunc) {
            var index = -1, i, l=collection.length;
            for (i=0; i<l; i++) {
                if (selectFunc(collection[i])) {
                    index = i;
                    break;
                }
            }
            return index;
        },
        
        
        // double vs single click convenience stuff
        // adds a clickData object with a click() property which should be 
        // called on click events.
        // if wait is set to true, the singleClick will be delayed slightly
        // to ensure it is not a double click event. Therefore, if wait is
        // not sent, although the response is faster, the single click event
        // will fire for the first click of a double click.
        addClickHandler : function(obj, onSingleClick, onDoubleClick, wait) {
            var threshold = 150;
            
            obj.clickData = {
                lastClick: 0,
                timer: null,
                click: function(event) {
                    var time = +new Date(),
                        diff = time - obj.clickData.lastClick,
                        doubleClick = diff < threshold,
                        self = this;
                    if (doubleClick) {
                        clearTimeout(obj.clickData.timer);
                        obj.clickData.lastClick = 0;
                        onDoubleClick.call(self, event);
                    } else {
                        obj.clickData.lastClick = time;
                        if (!wait) {
                            onSingleClick.call(self, event);
                        } else {
                            obj.clickData.timer = setTimeout(function() {
                                obj.clickData.lastClick = 0;
                                onSingleClick.call(self, event);
                            }, threshold);
                        }
                    }
                }
            }
        }
    }
    
    
    // root viewmodel defn
    var ViewModel = function() {
        
        this.setup = function() {
            this.collectionVM = new CollectionViewModel();
            this.collectionVM.load();
            this.playlistVM = new PlaylistViewModel();
            this.screenVM = new ScreenViewModel();
        }
    };
    
    
    function loadTemplates(callback) {
        var waiting = 0;
        $.each(music.templates, function(k, v) {
            waiting++;
            $.get(music.paths.templates + v, function(html) {
                var $s = $('<script>')
                    .attr('type', 'text/html')
                    .attr('id', k)
                    .html(html)
                $('body').append($s);
                waiting--;
                if (!waiting) {
                    callback.call();
                }
            });
        });
    }
    
    function setup() {
        music.root = new ViewModel();
        music.root.setup();
        ko.applyBindings(music.root);
        music.root.screenVM.refresh();
        
//         var l = false;
//         setInterval(function() {
//             var p = music.root.playlistVM.playlist;
//             if (l) {
//                 p.syncing(false);
//                 l = false;
//                 console.log('artificial lock released');
//             } else {
//                 l = false;
//                 if (!p.syncing()) {
//                     console.log('artificial lock');
//                     p.syncing(true);
//                     l = true;
//                 }
//             }
//         }, 5000);
    }
    
    // For some reason, the default value binding doesn't appear to fire on
    // empty values. Here's a very simple replacement which probably doesn't
    // implement everything 'value' does in full.
    ko.bindingHandlers.emptyValue = {
        init: function(element, valueAccessor) {
            $(element).change(function() { valueAccessor()(element.value) });
        },
        update: function(element, valueAccessor, allBindingsAccessor) {
            var value = valueAccessor(), 
                allBindingsAccessor = allBindingsAccessor(),
                valueUnwrapped = ko.utils.unwrapObservable(value);
            element.value = valueUnwrapped;
        }
    };
    
    

    
    loadTemplates(setup);
})(jQuery);
    