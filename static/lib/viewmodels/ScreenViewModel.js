"use strict";
(function($) {
    window.ScreenViewModel = function() {
        var self = this;
        this.height = ko.observable(0);
        this.width = ko.observable(0);
        this.appHeight = ko.computed(function() {
            var h = self.height();
            return Math.max(h-20, 0);
        });
        
        this.collectionPanelWidth = ko.computed(function() {
            return 200;
        });
        
        this.playlistPanelWidth = ko.computed(function() {
            var width = self.width();
            return $('.app-container').width() - $('.collection').outerWidth(true) - 10;
        });
        
        this.playlistGridHeight = ko.observable(0);

        this.treeHeight = ko.computed({
            read: function() {
                var h = self.height();
                var total = $('.collection').height();
                console.log(total);
                $('.collection>*').not('.tree-container').each(function() {
                    total -= $(this).outerHeight(true);
                });
                
                return total;
            },
            write: function(val) { 
                // dummy
            }
        });
        
        
        function height() {
            var offset = $('.playlist .grid-container > div').position();
            var $bar = $('.bottom-bar');
            
            self.playlistGridHeight( 
                self.appHeight() - (offset? offset.top : 0) - $bar.outerHeight()
            );
        }
        
        
        var resize = function() {
            var h = $(window).height();
            self.height(h);
            self.width($(window).width());
            self.treeHeight(0);
            
            height();
        }
        $(window).resize(resize);
        
        this.refresh = function() {
            resize();
        };


    }
}(jQuery));