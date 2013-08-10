'use strict';

var DeviceLayout = (function() {

  var DeviceLayout = {

    isLarge: function() {
      return media('(min-width: 992px)');
    },

    isSmall: function() {
      return media('(max-width: 480px)');
    },

    isMedium: function() {
      return media('(max-width: 991px) and (min-width: 481px)');
    }
  };

  function media(query) {
    return window.matchMedia(query).matches ? true : false;
  }

  return DeviceLayout;
}());
