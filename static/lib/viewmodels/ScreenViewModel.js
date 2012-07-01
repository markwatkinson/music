"use strict";
(function($) {
    window.ScreenViewModel = function() {
        var self = this;
        this.height = ko.observable(0);
        this.appHeight = ko.computed(function() {
            var h = self.height();
            return Math.max(h-20, 0);
        });
        
        
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
        var setHeight = function() {
            var h = $(window).height();
            self.height(h);
            self.treeHeight(0);
        }
        $(window).resize(setHeight);
        
        this.refresh = function() {
            setHeight();
        };

    }
}(jQuery));