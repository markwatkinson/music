"use strict";
window.Session = function() {
    var self = this;
    
    self.user = ko.observable('Default user');
    self.token = null;
}