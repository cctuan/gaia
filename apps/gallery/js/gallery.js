var touchstart = //'mousedown';
                'touchstart';
    var touchmove = //'mousemove';
                    'touchmove';
    var touchend = //'mouseup';
                    'touchend';

var test = {
  init: function() {
    this.go = 1;
    this.index = 0;
    this.totalWidth = window.innerWidth;
    this.a = document.getElementById('a');
    this.b = document.getElementById('b');
    this.c = document.getElementById('c');
    this.pages = [this.a, this.b, this.c];
    document.body.addEventListener(touchstart, this);
    document.body.addEventListener(touchmove, this);

    document.body.addEventListener(touchend, this);

  },
  nextPage: function() { // -1, 0, 1
    var result;
    if (this.go === 1) {
      var index = this.index += 1;
      if (this.pages[index])
        result = this.pages[index];
      else {
        result = this.pages[this.index -= 2];
        this.go = 0;
      }
    } else {
      var index = this.index -= 1;
      if (this.pages[index])
        result = this.pages[index];
      else {
        result = this.pages[this.index += 2];
        this.go = 1;
      }
    }
    console.log('arrow ' + this.go);
    console.log('index is ' + this.index);
    return result;
  },
  handleEvent: function(evt) {
    switch (evt.type) {
      case touchstart:
        this.currentPage = evt.target;
        this.startX = evt.touches[0].pageX;
        this.a.style.MozTransition = '';
        this.b.style.MozTransition = '';
        break;
      case touchmove:
        var x = evt.touches[0].pageX;
        var deltax = x - this.startX;
        if (this.currentPage === this.a) {
          this.a.style.MozTransform = 'translateX(' + (deltax) + 'px)';
          this.b.style.MozTransform = 'translateX(' +
                                      (deltax + this.totalWidth) + 'px)';
        } else if (this.currentPage === this.b) {
          this.a.style.MozTransform = 'translateX(-' +
                                      (this.totalWidth - deltax) + 'px)';
          this.b.style.MozTransform = 'translateX(' + (deltax) + 'px)';
        }
        break;
      case touchend:
        this.a.style.MozTransition = '-moz-transform 300ms ease';
        this.b.style.MozTransition = '-moz-transform 300ms ease';
        if (this.currentPage === this.a) {
          this.b.style.MozTransform = 'translateX(0)';
          this.a.style.MozTransform = 'translateX(-' +
                                      (this.totalWidth) + 'px)';
        } else if (this.currentPage === this.b) {
          this.b.style.MozTransform = 'translateX(' + this.totalWidth + 'px)';
          this.a.style.MozTransform = 'translateX(0)';
        }
        break;
    }
  },
  autoSwitch: function(stepwidth, stepinterval) {
    var self = this;
    var timeout = stepinterval;
    var totalWidth = this.totalWidth;
    var nextPage = this.nextPage();
    var tempWidth = 0;
    var step = stepwidth;
    var currentPage = this.pages[0];

    goArrow(currentPage, nextPage);

    function translating(a, b) {
      if (self.go === 1) {
        a.style.MozTransform = 'translateX(-' +
                                    (tempWidth) + 'px)';
        b.style.MozTransform = 'translateX(' +
                                    (totalWidth - tempWidth) + 'px)';
      } else {
        a.style.MozTransform = 'translateX(' +
                                    (tempWidth) + 'px)';
        b.style.MozTransform = 'translateX(-' +
                                    (totalWidth - tempWidth) + 'px)';
      }
    }
    function goArrow(a, b) {
      a.classList.remove('hide');
      b.classList.remove('hide');
      var interval = setInterval(function() {
        tempWidth += step;
        translating(a, b);
        if (Math.abs(tempWidth) >= totalWidth / 2) {
          clearInterval(interval);

          tempWidth = 0;
          finishTransition(a, b, function() {

            a.classList.add('hide');
            c = self.nextPage();
            goArrow(b, c);
          });
        }

      }, timeout);

      function finishTransition(pagea, pageb, callback) {
        pagea.addEventListener('transitionend', function transit() {
          pagea.removeEventListener('transitionend', transit);
          pagea.style.MozTransition = '';
          pageb.style.MozTransition = '';
          callback();
        });
        pagea.style.MozTransition = '-moz-transform 300ms ease';
        pageb.style.MozTransition = '-moz-transform 300ms ease';
        if (self.go === 1) {
          pageb.style.MozTransform = 'translateX(0)';
          pagea.style.MozTransform = 'translateX(-' +
                                      (totalWidth) + 'px)';
        } else {
          pageb.style.MozTransform = 'translateX(0)';
          pagea.style.MozTransform = 'translateX(' +
                                      (totalWidth) + 'px)';
        }
      }
    }
  }
};

document.addEventListener('DOMContentLoaded', function() {
  test.init();
  test.autoSwitch(1, 1); // step width , step interval
});
