'use strict';

var DeviceLayout = (function() {

  var DEVICE_WIDTH = window.screen.width;

  var DeviceLayout = {

    isLarge: function() {
      return (DEVICE_WIDTH > 991) ? true : false;
    },

    isSmall: function() {
      return (DEVICE_WIDTH < 481) ? true : false;
    },

    isMedium: function() {
      return (DEVICE_WIDTH < 992 && DEVICE_WIDTH > 480) ? true : false;
    }
  };
  return DeviceLayout;
}());
