/* global MocksHelper, LayoutManager, AppWindow, TextSelectionDialog */
'use strict';

mocha.globals(['AppWindow', 'TextSelectionDialog', 'System', 'BaseUI',
  'layoutManager']);

// requireApp('system/test/unit/mock_l10n.js');
requireApp('system/test/unit/mock_layout_manager.js');
requireApp('system/test/unit/mock_app_window.js');

var mocksForTextSelectionDialog = new MocksHelper([
  'AppWindow', 'LayoutManager'
]).init();

suite('system/TextSelectionDialog', function() {
  var app, td, fragment;
  mocksForTextSelectionDialog.attachTestHelpers();
  var mockDetail = {};
  setup(function(done) {
    window.layoutManager = new LayoutManager().start();
    window.layoutManager.width = 360;
    window.layoutManager.height = 480;
    mockDetail = {
      selectall: function() {},
      pasteFromClipboard: function() {},
      cutToClipboard: function() {},
      copyToClipboard: function() {}
    };
    requireApp('system/js/system.js');
    requireApp('system/js/base_ui.js');

    requireApp('system/js/text_selection_dialog.js',
      function() {
        app = new AppWindow(fakeAppConfig1);
        td = new TextSelectionDialog(app);

        fragment = document.createElement('div');
        fragment.id = 'TextSelectionDialogRoot';
        fragment.innerHTML = td.view();
        document.body.appendChild(fragment);

        done();
      }
    );
  });

  teardown(function() {
    delete window.layoutManager;
    // navigator.mozL10n = realL10n;
    document.body.removeChild(fragment);
    fragment = null;
    td = null;
    app = null;
    mockDetail = {};
  });

  var fakeTextSelectInAppEvent = {
    type: 'mozbrowserselectionchange',
    preventDefault: function() {},
    stopPropagation: function() {}
  };

  var fakeAppConfig1 = {
    url: 'app://www.fake/index.html',
    manifest: {},
    manifestURL: 'app://wwww.fake/ManifestURL',
    origin: 'app://www.fake',
    name: 'Fake Application'
  };

  function verifyClickableOptions(config) {
    var lastOption;
    for (var item1 in config) {
      if(config[item1]) {
        lastOption = item1;
        mockDetail['can' + item1] = true;
      } else {
        mockDetail['can' + item1] = false;
      }
    }

    fakeTextSelectInAppEvent.detail = mockDetail;
    td.handleEvent(fakeTextSelectInAppEvent);

    if (lastOption) {
      assert.equal(td.element.classList.contains('visible'), true,
      'dialog should display');
    } else {
      assert.equal(td.element.classList.contains('visible'), false,
      'dialog should display');
      return;
    }

    for (var item2 in config) {
      var element = td.elements[item2.toLowerCase()];
      if (config[item2]) {
        assert.equal(element.classList.contains('hidden'),
          false, 'option of ' + item2 + ' should display');
      } else {
        assert.equal(element.classList.contains('hidden'),
          true, 'option of ' + item2 + ' should be hidden');
      }
    }
    assert.equal(
      td.elements[lastOption.toLowerCase()].classList.contains('last-option'),
      true, 'last-option class should be added to the last element of array');
  }

  function emitMouseDownEvent(ele) {
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('mousedown', true, false, null);
    ele.dispatchEvent(evt);
  }

  test('New', function() {
    assert.isDefined(td.instanceID);
  });

  test('option display', function() {
    mockDetail.show = true;
    verifyClickableOptions({
      'SelectAll': true,
      'Paste': false,
      'Cut': true,
      'Copy': false
    });

    verifyClickableOptions({
      'SelectAll': false,
      'Paste': true,
      'Cut': false,
      'Copy': false
    });
  });

  test('_doCommand on app, and it is app', function() {
    var testCmd = 'testCmd';
    mockDetail.show = true;
    verifyClickableOptions({
      'SelectAll': true,
      'Paste': true,
      'Cut': true,
      'Copy': false
    });

    td.app.iframe = {
      doCommand: function(){}
    };

    this.sinon.stub(td.app.iframe, 'doCommand');
    td._doCommand(fakeTextSelectInAppEvent, testCmd);
 
    assert.equal(td.element.classList.contains('visible'), false,
      'dialog should be hidden');
    assert.deepEqual(td.app.iframe.doCommand.args[0], [testCmd]);
  });


  test('_doCommand on app, and not app', function() {
    var testCmd = 'testCmd';
    mockDetail.show = true;
    verifyClickableOptions({
      'SelectAll': true,
      'Paste': true,
      'Cut': true,
      'Copy': false
    });
    var receivedEvent;
    td.app = null;
    window.addEventListener('mozContentEvent', function onevent(evt) {
      window.removeEventListener('mozContentEvent', onevent);
      receivedEvent = evt;
    });
    td._doCommand(fakeTextSelectInAppEvent, testCmd);
    assert.deepEqual(receivedEvent.detail, {
      type: 'do-command',
      cmd: testCmd
    });
  });

  test('option handler, selectAll', function() {
    mockDetail.show = true;
    verifyClickableOptions({
      'SelectAll': true,
      'Paste': true,
      'Cut': true,
      'Copy': true
    });
    this.sinon.stub(td, '_doCommand');

    emitMouseDownEvent(td.elements.selectall);
    assert.equal(td._doCommand.args[0][1], 'selectall');
  });

  test('option handler, paste', function() {
    mockDetail.show = true;
    verifyClickableOptions({
      'SelectAll': true,
      'Paste': true,
      'Cut': true,
      'Copy': true
    });
    this.sinon.stub(td, '_doCommand');

    emitMouseDownEvent(td.elements.paste);
    assert.equal(td._doCommand.args[0][1], 'paste');
  });

  test('option handler, cut', function() {
    mockDetail.show = true;
    verifyClickableOptions({
      'SelectAll': true,
      'Paste': true,
      'Cut': true,
      'Copy': true
    });
    this.sinon.stub(td, '_doCommand');

    emitMouseDownEvent(td.elements.cut);
    assert.equal(td._doCommand.args[0][1], 'cut');
  });

  test('option handler, copy', function() {
    mockDetail.show = true;
    verifyClickableOptions({
      'SelectAll': true,
      'Paste': true,
      'Cut': true,
      'Copy': true
    });
    this.sinon.stub(td, '_doCommand');

    emitMouseDownEvent(td.elements.copy);
    assert.equal(td._doCommand.args[0][1], 'copy');
  });

  suite('dialog position', function() {
    var windowHeight;
    var windowWidth;
    setup(function() {
      windowHeight = window.layoutManager.height;
      windowWidth = window.layoutManager.width;
      td.DISTANCE_FROM_SELECTEDAREA_TO_MENUTOP = 12;
      td.DISTANCE_FROM_MENUBOTTOM_TO_SELECTEDAREA = 34;
      td.TEXTDIALOG_WIDTH = 52;
      td.TEXTDIALOG_HEIGHT = 48;
    });

    test('if space is enough, and not app', function() {
      var numOfSelectOptions = 3;
      mockDetail.top = windowHeight - 120;
      mockDetail.bottom = windowHeight - 20;
      mockDetail.left = windowWidth - 300;
      mockDetail.right = windowWidth - 100;
      mockDetail.zoomFactor = 1;
      mockDetail.frameOffsetY = 20;
      mockDetail.frameOffsetX = 15;
      td.app = false;
      var result =
        td.calculateDialogPostion(mockDetail, numOfSelectOptions, false);
      assert.deepEqual(result, {
        top: mockDetail.top * mockDetail.zoomFactor - td.TEXTDIALOG_HEIGHT -
          td.DISTANCE_FROM_MENUBOTTOM_TO_SELECTEDAREA + mockDetail.frameOffsetY,
        left: ((mockDetail.left + mockDetail.right) * mockDetail.zoomFactor -
          numOfSelectOptions * td.TEXTDIALOG_WIDTH)/ 2 + mockDetail.frameOffsetX
      });
    });

    test('if space is enough, and is app', function() {
      var numOfSelectOptions = 3;
      mockDetail.top = windowHeight - 120;
      mockDetail.bottom = windowHeight - 20;
      mockDetail.left = windowWidth - 300;
      mockDetail.right = windowWidth - 100;
      mockDetail.zoomFactor = 1;
      mockDetail.frameOffsetY = 20;
      mockDetail.frameOffsetX = 15;
      td.app = true;
      var result =
        td.calculateDialogPostion(mockDetail, numOfSelectOptions, false);
      assert.deepEqual(result, {
        top: mockDetail.top * mockDetail.zoomFactor - td.TEXTDIALOG_HEIGHT -
          td.DISTANCE_FROM_MENUBOTTOM_TO_SELECTEDAREA,
        left: ((mockDetail.left + mockDetail.right) * mockDetail.zoomFactor -
          numOfSelectOptions * td.TEXTDIALOG_WIDTH)/ 2
      });
    });

    test('if utility bubble can overlay the header, and not app', function() {
      var numOfSelectOptions = 3;
      mockDetail.top = 10;
      mockDetail.bottom = windowHeight - 100;
      mockDetail.left = windowWidth - 300;
      mockDetail.right = windowWidth - 100;
      mockDetail.zoomFactor = 1;
      mockDetail.frameOffsetY = 20;
      mockDetail.frameOffsetX = 15;
      td.app = false;
      var result =
        td.calculateDialogPostion(mockDetail, numOfSelectOptions, false);
      assert.deepEqual(result, {
        top: mockDetail.bottom * mockDetail.zoomFactor +
          td.DISTANCE_FROM_SELECTEDAREA_TO_MENUTOP + mockDetail.frameOffsetY,
        left: ((mockDetail.left + mockDetail.right) * mockDetail.zoomFactor -
          numOfSelectOptions * td.TEXTDIALOG_WIDTH)/ 2 + mockDetail.frameOffsetX
      });
    });

    test('if utility bubble can overlay the header and zoom factor is 2,' +
      'and not app', function() {
        var numOfSelectOptions = 3;
        mockDetail.top = 10;
        mockDetail.bottom = windowHeight - 100;
        mockDetail.left = windowWidth - 300;
        mockDetail.right = windowWidth - 100;
        mockDetail.zoomFactor = 2;
        mockDetail.frameOffsetY = 20;
        mockDetail.frameOffsetX = 15;
        td.app = false;
        var result =
          td.calculateDialogPostion(mockDetail, numOfSelectOptions, false);
        var posTop;
        if (mockDetail.bottom * mockDetail.zoomFactor >= windowHeight) {
          posTop = (mockDetail.top * mockDetail.zoomFactor + windowHeight -
            td.TEXTDIALOG_HEIGHT) / 2 + mockDetail.frameOffsetY;
        } else {
          posTop = ((mockDetail.top + mockDetail.bottom) *
            mockDetail.zoomFactor - td.TEXTDIALOG_HEIGHT) / 2 +
            mockDetail.frameOffsetY;
        }
        assert.deepEqual(result, {
          top: posTop,
          left: windowWidth - numOfSelectOptions * td.TEXTDIALOG_WIDTH +
            mockDetail.frameOffsetX
        });
      });

    test('if utility bubble can overlay the left boundary, and not app',
      function() {
        var numOfSelectOptions = 3;
        mockDetail.top = 10;
        mockDetail.bottom = windowHeight - 100;
        mockDetail.left = 10;
        mockDetail.right = 20;
        mockDetail.zoomFactor = 1;
        mockDetail.frameOffsetY = 20;
        mockDetail.frameOffsetX = 15;
        td.app = false;
        var result =
          td.calculateDialogPostion(mockDetail, numOfSelectOptions, false);
        assert.deepEqual(result, {
          top: mockDetail.bottom * mockDetail.zoomFactor +
            td.DISTANCE_FROM_SELECTEDAREA_TO_MENUTOP + mockDetail.frameOffsetY,
          left: mockDetail.frameOffsetX
        });
      });

    test('if utility bubble can overlay the right boundary, and not app',
      function() {
        var numOfSelectOptions = 3;
        mockDetail.top = 10;
        mockDetail.bottom = windowHeight - 100;
        mockDetail.left = windowWidth - 10;
        mockDetail.right = windowWidth;
        mockDetail.zoomFactor = 1;
        mockDetail.frameOffsetY = 20;
        mockDetail.frameOffsetX = 15;
        td.app = false;
        var result =
          td.calculateDialogPostion(mockDetail, numOfSelectOptions, false);
        assert.deepEqual(result, {
          top: mockDetail.bottom * mockDetail.zoomFactor +
            td.DISTANCE_FROM_SELECTEDAREA_TO_MENUTOP + mockDetail.frameOffsetY,
          left: windowWidth + mockDetail.frameOffsetX -
            numOfSelectOptions * td.TEXTDIALOG_WIDTH
        });
      });

  });

});
