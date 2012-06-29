"use strict";
(function($) {
    window.ScreenViewModel = function() {
        var self = this;
        this.height = ko.observable(0);
        this.appHeight = ko.computed(function() {
            var h = self.height();
            return Math.max(h-20, 0);
        });
        
        var setHeight = function() {
            var h = $(window).height();
            self.height(h);
        }
        $(window).resize(setHeight);
        setHeight();
    }
}(jQuery));