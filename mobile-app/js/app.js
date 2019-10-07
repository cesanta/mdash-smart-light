var h = preact.h;
var App = {};

App.settings = {
  provisionURL: 'http://192.168.4.1',
  mdashURL: 'https://mdash.net',
  appKey: '',               // mDash -> Keys -> Add new
  callTimeoutMilli: 10000,  // 10 seconds
};

App.Header = function(props) {
  return h(
      'div', {class: 'p-2 border-bottom bg-light'},
      h('b', {}, props.app.state.title),
      h('div', {class: 'float-right'},
        h('small', {class: 'text-muted mr-2 font-weight-light'},
          'mDash Smart Light'),
        h('img', {height: 24, src: 'images/logo-512x512.png'})));
};

App.Footer = function(props) {
  var self = this, app = props.app;

  self.mkTabButton = function(title, icon, tab, href) {
    var active = (location.href == href);
    return h(
        'a', {
          href: href,
          class: 'text-center ' +
              (active ? 'font-weight-bold text-primary' : 'text-dark'),
          style: 'flex:1;height:3em;text-decoration:none;' +
              'border-top: 3px solid ' + (active ? '#007bff' : 'transparent'),
        },
        h('div', {class: '', style: 'line-height: 1.4em'},
          h('i', {class: 'mr-0 fa-fw fa ' + icon, style: 'width: 2em;'}),
          h('div', {class: 'small'}, title)));
  };

  self.render = function(props, state) {
    var baseurl = location.host + location.pathname;
    return h(
        'footer', {
          class: 'd-flex align-items-stretch border-top',
          style: 'flex-shrink: 0;'
        },
        self.mkTabButton(
            'My Devices', 'fa-server', PageDevices,
            App.settings.protocol + '//' + baseurl + '#/'),
        self.mkTabButton(
            'Add Device', 'fa-plus-circle', PageAddDevice,
            'http://' + baseurl + '?' + app.state.customer.token + '#/add1'));
  };
};

App.errorHandler = function(e) {
  var msg = (((e.response || {}).data || {}).e || {}).message || e.message || e;
  alert(msg);
};

var SpinButton = function(props) {
  var self = this, state = self.state;
  self.componentDidMount = function() {
    self.setState({spin: false});
  };
  return h(
      'button', {
        class: 'btn ' + (props.class || ''),
        disabled: props.disabled || state.spin,
        style: props.style || '',
        ref: props.ref,
        onClick: function() {
          if (!props.onClick) return;
          self.setState({spin: true});
          props.onClick().catch(App.errorHandler).then(function() {
            self.setState({spin: false});
          });
        }
      },
      h('i', {
        class: 'mr-1 fa fa-fw ' +
            (state.spin ? 'fa-refresh' : (props.icon || 'fa-save')) +
            (state.spin ? ' fa-spin' : '')
      }),
      props.title || 'submit');
};

var Device = function(props) {
  var self = this;
  var url = App.settings.mdashURL + '/api/v2/m/device?access_token=' + props.k;

  self.componentDidMount = function() {
    self.setState({device: null});
    self.refresh();
  };

  self.refresh = function() {
    return axios.get(url)
        .then(function(res) {
          self.setState({device: res.data});
        })
        .catch(function(err) {
          self.setState({device: {id: ''}});
        });
  };

  self.render = function(props, state) {
    var d = state.device;
    if (!d)
      return h(
          'div', {class: 'py-2 border-bottom'},
          h('div', {class: 'h-100 d-flex align-items-center'},
            h('div', {class: 'text-center w-100 text-muted'},
              h('i', {class: 'fa fa-refresh fa-spin'}), h('br'),
              'Initialising device...')));

    var shadow = d.shadow || {};
    var reported = (shadow.state || {}).reported || {};
    var ar = reported.app || {};
    var online = reported.online || false;
    var cbid = 'toggle-' + d.id;
    var checked = ar.on || false;
    return h(
        'div', {class: 'py-2 border-bottom d-flex flex-row'},
        h('div', {}, h('b', {class: 'small font-weight-bold'}, d.id),
          h('div', {},
            h('b',
              {class: 'small ' + (online ? 'text-success' : 'text-danger')},
              online ? 'online' : 'offline'))),
        h('div', {class: 'flex-grow-1 d-flex justify-content-end'},
          h('small', {class: 'mr-2 my-auto text-muted'}, 'toggle light:'),
          h('span', {class: 'toggle my-auto'}, h('input', {
              type: 'checkbox',
              id: cbid,
              disabled: !online,
              checked: checked,
              onChange: function(ev) {
                var body = {shadow: {state: {desired: {}}}};
                body.shadow.state.desired.on = ev.target.checked;
                axios.post(url, body).catch(App.errorHandler);
              },
            }),
            h('label', {'for': cbid}, h('span')))));
  };
};

var PageDevices = function(props) {
  var self = this;
  self.componentDidMount = function() {
    props.app.setState({title: 'My Devices'});
  };
  self.render = function(props, state) {
    var keys = Object.keys((props.app.state.customer || {}).meta || {});
    return h(
        'div', {class: 'overflow-auto p-2'},
        keys.length == 0 ?
            h('div', {class: 'h-100 d-flex align-items-center'},
              h('div',
                {class: 'text-center w-100 text-muted font-weight-light'},
                h('i', {class: 'fa fa-bell-o fa-2x'}), h('br'),
                'No devices yet')) :
            h('div', {class: 'h-100'}, keys.map(function(k) {
              return h(Device, {k: k, app: props.app});
            })));
  }
};

var PageAddDevice = function(props) {
  var self = this;

  self.componentDidMount = function() {
    props.app.setState({title: 'Add Device'});
    self.setState({step: 0, ssid: '', pass: '', public_key: ''});
  };

  self.componentWillUnmount = function() {
    self.unmounted = true;
  };

  var alertClass = 'p-2 small text-muted font-weight-light';
  var Step0 =
      h('div', {},
        h('div', {class: alertClass}, 'Go to your phone settings', h('br'),
          'Join WiFi network SmartLight-XXXX', h('br'),
          'Return to this screen and press the Scan button'),
        h(SpinButton, {
          class: 'btn-block btn-primary border font-weight-light',
          title: 'Scan',
          icon: 'fa-search',
          onClick: function() {
            return new Promise(function(resolve, reject) {
              var attempts = 0;
              var f = function() {
                var error = function(err) {
                  console.log('Error: ', err);
                  if (!self.unmounted) setTimeout(f, 500);
                };
                var success = function(res) {
                  var key = res.data.result;
                  if (key) {
                    self.setState({step: 1, public_key: key});
                    resolve();
                    return;
                  } else {
                    reject(res.data.error);
                  }
                };
                axios({
                  url : App.settings.provisionURL + '/GetKey',
                  timeout : App.settings.callTimeoutMilli,
                }).then(success, error);
                attempts++;
                console.log('attempt', attempts);
              };
              f();
            });
          },
        }));
  var Step1 = h(
      'div', {},
      h('a', {
        href: location.href,
        class: 'link text-decoration-none',
        onClick: function() {
          self.setState({step: 0});
        }
      },
        '\u2190', ' back'),
      h('div', {class: alertClass + ' mt-2'}, 'Found new device!'), h('input', {
        class: 'form-control mb-2',
        type: 'text',
        placeholder: 'WiFi network name',
        onInput: function(ev) {
          self.setState({ssid: ev.target.value});
        },
      }),
      h('input', {
        class: 'form-control mb-2',
        type: 'text',
        placeholder: 'WiFi password',
        onInput: function(ev) {
          self.setState({pass: ev.target.value});
        },
      }),
      h(SpinButton, {
        class: 'btn-block btn-primary font-weight-light',
        title: 'Configure device WiFi',
        icon: 'fa-save',
        disabled: !self.state.ssid,
        onClick: function() {
          var data =
              JSON.stringify({ssid: self.state.ssid, pass: self.state.pass});
          return axios({
                   method : 'POST',
                   url : App.settings.provisionURL + '/setup',
                   timeout : App.settings.callTimeoutMilli,
                   data : data,
                 })
              .then(function(res) {
                if (res.data.result) {
                  self.setState({step: 2});
                } else {
                  alert('Error: ' + res.data.error);
                }
              });
        },
      }));
  var Step2 =
      h('div', {},
        h('a', {
          href : location.href,
          class : 'link text-decoration-none',
          onClick : function() { self.setState({step : 1}); }
        },
          '\u2190', ' back'),
        h('div', {class : alertClass + ' mt-2'}, 'WiFi configuretion applied. ',
          'Go to your phone settings,', h('br'),
          'Join back to your WiFi network,', h('br'),
          'Return to this screen and press on Register device.'),
        h(SpinButton, {
          class : 'btn-block btn-primary border font-weight-light',
          title : 'Register device',
          icon : 'fa-plus-circle',
          onClick : function() {
            var url = App.settings.mdashURL + '/customer?access_token=' +
                      props.app.state.customer.token;
            return axios.get(url)
                .then(function(res) {
                  var data = res.data;
                  if (!data.meta) data.meta = {};
                  data.meta[self.state.public_key] = {};
                  return axios({method: 'POST', url: url, data: data});
                })
                .then(function(res) {
                  // props.app.setState({user: res.data});
                  console.log('success!!!');
                  location.href = App.settings.protocol + '//' + location.host +
                                  location.pathname;
                  // self.setState({step: 1});
                })
                .catch(function(err) {
                  alert(
                      'Error registering device (' + err +
                      '). Join your WiFi network and retry.');
                });
          }
        }));
  var steps = [Step0, Step1, Step2];
  return h('div', {class: 'overflow-auto p-2'}, steps[self.state.step]);
};

var Content = function(props) {
  return h(
      preactRouter.Router, {
        history: History.createHashHistory(),
        onChange: function(ev) {
          props.app.setState({url: ev.url});
        }
      },
      h(PageDevices, {app: props.app, default: true}),
      h(PageAddDevice, {app: props.app, path: 'add1'}));
};

App.Instance = function(props) {
  var self = this;

  self.componentDidMount = function() {
    // This app uses non-authenticated anonymous customers
    // App goes to mDash and says: register a new anonymous customer for me.
    // mDash creates an anonymous customer and returns access token.
    // An app stores this token for later, and associates all devices
    // with that anonymous customer.
    //
    // This app does not provide a way to share this customer, so it is not
    // possible to "login" from another phone or laptop and see same devices.
    // For that, use authenticated customers.
    var access_token = location.search.substring(1) || localStorage.sltok;
    if (access_token === 'undefined') access_token = undefined;
    if (access_token) {
      self.loadCustomer(access_token);
    } else {
      // Register new customer
      axios.get(App.settings.mdashURL + '/newcustomer')
          .then(function(res) {
            return self.loadCustomer(res.data.token);
          })
          .catch(App.errorHandler);
    }
  };

  self.loadCustomer = function(access_token) {
    var url = App.settings.mdashURL + '/customer?access_token=' + access_token;
    return axios.get(url)
        .then(function(res) {
          self.setState({customer: res.data});
          localStorage.sltok = res.data.token;
          if (location.search.length > 0)
            location.href = location.protocol + '//' + location.host +
                location.pathname + location.hash;
        })
        .catch(function() {});
    //.catch(App.errorHandler);
  };

  self.render = function(props, state) {
    var p = {app: self};
    return h(
        'div', {
          class: 'main border',
          style: 'max-width: 480px; margin: 0 auto; ' +
              'min-height: 100%; max-height: 100%;' +
              'display:grid;grid-template-rows: auto 1fr auto;' +
              'grid-template-columns: 100%;',
        },
        h(App.Header, p), h(Content, p), h(App.Footer, p));
  };
};

window.onload = function() {
  if (!window.localStorage) alert('Unsupported platform!');
  preact.render(h(App.Instance), document.body);

  if ('serviceWorker' in navigator)  // for PWA
    navigator.serviceWorker.register('js/service-worker.js')
        .catch(function(err) {});
};
