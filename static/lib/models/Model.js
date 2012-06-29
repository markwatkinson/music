"use strict";
window.Model = function() {
    var self = this;
    // list of writable attributes
    this.attrs_ = {};
    this.attrTypes_ = {};
    this.setOverride_ = {};
    
    
    // some item specific data the collection is responsible for maintaining
    // but which is useful to store on the item for ease of access
    // basically, having this here stops us from needing to either subclass this
    // object for different viewmodels, or implementing ugly mappings inside
    // the VM
    this.collectionData = {
        // for determining dbl vs single click events
        clickData: {
            lastClick: 0,
            timer: null
        },
        expanded: ko.observable(false),
        toggleExpand: function() {
            this.collectionData.expanded( !this.collectionData.expanded() );
        }.bind(this)
    };
}

Model.prototype.addVmData = function(dataSet, name, value) {
    if (this[dataSet][name]) return;
    else this[dataSet][name] = value;
}
// Sets the given attributes (map)
Model.prototype.set = function(data) {
    data = data || {};
    for (var p in data) {
        var value, type, setFunc;

        if (this.attrs_[p] !== true) { continue; }
        
        value = data[p];
        type = this.attrTypes_[p];
        setFunc = this.setOverride_[p];
        if (typeof setFunc !== 'undefined') {
            setFunc.call(this, value);
        }
        else {
            // instantiate the new type if necassary
            if (typeof type !== 'undefined' && !(value instanceof type)) {
                value = new type(value);
            }
        
            if (typeof this[p] === 'function') {
                this[p](value);
            } else {
                this[p] = value;
            }
        }
    }
}

// sets the given attributes (array) as writeable)
Model.prototype.attrs = function(attrs) {
    for (var i=0; i<attrs.length; i++) {
        this.attrs_[attrs[i]] = true;
    }
}
// sets the given attributes to a particular Model subclass
Model.prototype.attrTypes = function(map) {
    for (var attr in map) {
        this.attrTypes_[attr] = map[attr];
    }
}

Model.prototype.setOverride = function(map) {
    for (var attr in map) {
        this.setOverride_[attr] = map[attr];
    }
}

// load object from the data store (override this)
Model.prototype.load = function(params) {
    
}

Model.prototype.loadChildren = function(complete) { 
    if (complete) complete();
}