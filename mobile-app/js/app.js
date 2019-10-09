var h = preact.h;
var App = {};

App.settings = {
  provisionURL: 'http://192.168.4.1',
  mdashURL: 'https://mdash.net',
  appID: '',
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

  var mkTabButton = function(title, icon, tab, href) {
    var active = (location.hash == href.replace(/.*#/, '#'));
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

  var proto = App.settings.mdashURL.split(':')[0];
  var base = proto + '://' + location.host + location.pathname;
  var ibase = base.replace(/^https/, 'http');
  return h(
      'footer', {
        class: 'd-flex align-items-stretch border-top',
        style: 'flex-shrink: 0;'
      },
      mkTabButton('My Devices', 'fa-server', App.PageDevices, base + '#/'),
      mkTabButton(
          'Add Device', 'fa-plus-circle', App.PageAddDevice,
          ibase + '?' + app.state.u.token + '#/new'));
};

App.errorHandler = function(e) {
  var o = ((e.response || {}).data || {}).error || {};
  alert(o.message || e.message || e);
};

App.setKey = function(obj, key, val) {
  var parts = key.split('.');
  for (var i = 0; i < parts.length; i++) {
    if (i >= parts.length - 1) {
      obj[parts[i]] = val;
    } else {
      if (!obj[parts[i]]) obj[parts[i]] = {};
      obj = obj[parts[i]];
    }
  }
};

App.getKey = function(obj, key) {
  var parts = key.split('.');
  for (var i = 0; i < parts.length; i++) {
    if (typeof (obj) != 'object') return undefined;
    if (!(parts[i] in obj)) return undefined;
    obj = obj[parts[i]];
  }
  return obj;
};

App.Toggler = function(props) {
  var self = this, state = self.state;
  self.componentDidMount = function() {
    state.expanded = props.expanded || false;
  };
  var div = state.expanded ?
      props.children :
      props.dnone ? h('div', {class: 'd-none'}, props.children) : null;
  return h(
      'span', {class: props.class || '', style: 'z-index: 999;'},
      h('a', {
        onClick: function(ev) {
          ev.preventDefault();
          self.setState({expanded: !state.expanded});
        },
        href: '#'
      },
        props.text || '', h('i', {
          class:
              'ml-2 fa ' + (state.expanded ? 'fa-caret-down' : 'fa-caret-right')
        })),
      props.extra, div);
};

App.Login = function(props) {
  var self = this;
  self.componentDidMount = function() {
    self.setState({email: '', pass: ''});
  };

  self.render = function(props, state) {
    return h(
        'div', {
          class: 'mx-auto bg-light rounded border my-5',
          style: 'max-width: 480px;'
        },
        h('h3', {class: 'text-center py-3 text-muted'}, 'Smart Light login'),
        h('div', {class: 'form p-3 rounded w-100'}, h('input', {
            type: 'email',
            placeholder: 'Email',
            class: 'my-2 form-control',
            onInput: function(ev) {
              self.setState({email: ev.target.value});
            }
          }),
          h('input', {
            type: 'password',
            placeholder: 'Password',
            class: 'my-2 form-control',
            onInput: function(ev) {
              self.setState({pass: ev.target.value});
            }
          }),
          h(App.SpinButton, {
            class: 'btn-block btn-secondary',
            disabled: !state.email || !state.pass,
            title: 'Sign In',
            icon: 'fa-sign-in',
            onClick: function() {
              var h = {
                Authorization: 'Basic ' + btoa(state.email + ':' + state.pass)
              };
              return axios
                  .get(App.settings.mdashURL + '/customer', {headers: h})
                  .then(function(res) {
                    props.app.login(res.data);
                    preactRouter.route('');
                  })
                  .catch(App.errorHandler);
            }
          }),
          h('div', {class: 'mt-2'}, 'No account yet? ',
            h(App.Toggler, {text: 'Register'},
              h('div', {}, h('input', {
                  type: 'email',
                  placeholder: 'Email',
                  class: 'my-2 form-control',
                  onInput: function(ev) {
                    self.setState({email: ev.target.value});
                  },
                }),
                h(App.SpinButton, {
                  class: 'btn-block btn-secondary',
                  icon: 'fa-envelope',
                  title: 'Send invitation',
                  disabled: !state.email,
                  onClick: function() {
                    var app_id = location.pathname.split('/')[2] || 'setme';
                    var args = {
                      email: state.email,
                      url: App.settings.mdashURL,
                      from: 'SmartLight',
                      redir: location.href,
                      app_id: app_id,
                      text: 'Thank you for registering with SmartLight.\n' +
                          'Your login: EMAIL\n' +
                          'Your password: PASS\n' +
                          'Please activate your account by ' +
                          'visiting the link below:\nREGLINK'
                    };
                    return axios.post(App.settings.mdashURL + '/invite', args)
                        .then(function(res) {
                          alert('Thank you! Check your inbox and login.');
                          self.setState({email: ''});
                          location.reload();
                        })
                        .catch(App.errorHandler);
                  },
                }))))));
  };
};


App.SpinButton = function(props) {
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

App.DeviceWidget = function(props) {
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
    var toggle =
        h('span', {class: 'text-nowrap d-flex justify-content-end'},
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
            h('label', {'for': cbid}, h('span'))));
    return h(
        'div', {class: 'py-2 border-bottom d-flex flex-row'},
        h('div', {class: 'mr-5'},
          h('b', {class: 'small font-weight-bold'}, d.id),
          h('div', {class: ''},
            h('b',
              {class: 'small ' + (online ? 'text-success' : 'text-danger')},
              online ? 'online' : 'offline'))),
        toggle,
        h('div', {class: 'flex-grow-1 d-flex justify-content-end mr-2 mt-1'},
          h('a', {href: '/devices/' + encodeURIComponent(props.k)},
            h('i', {class: 'fa fa-cog'}))));
  };
};

App.PageDevices = function(props) {
  var self = this;
  self.componentDidMount = function() {
    props.app.setState({title: 'My Devices'});
  };
  self.render = function(props, state) {
    var pubkeys = Object.keys((props.app.state.u || {}).pubkeys || {});
    return h(
        'div', {class: 'overflow-auto p-2'},
        pubkeys.length == 0 ?
            h('div', {class: 'h-100 d-flex align-items-center'},
              h('div',
                {class: 'text-center w-100 text-muted font-weight-light'},
                h('i', {class: 'fa fa-bell-o fa-2x'}), h('br'),
                'No devices yet')) :
            h('div', {class: 'h-100'}, pubkeys.map(function(k) {
              return h(App.DeviceWidget, {k: k, app: props.app});
            })));
  }
};

App.PageAddDevice = function(props) {
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
        h(App.SpinButton, {
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
      h(App.SpinButton, {
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
          href: location.href,
          class: 'link text-decoration-none',
          onClick: function() {
            self.setState({step: 1});
          }
        },
          '\u2190', ' back'),
        h('div', {class: alertClass + ' mt-2'}, 'WiFi configuretion applied. ',
          'Go to your phone settings,', h('br'),
          'Join back to your WiFi network,', h('br'),
          'Return to this screen and press on Register device.'),
        h(App.SpinButton, {
          class: 'btn-block btn-primary border font-weight-light',
          title: 'Register device',
          icon: 'fa-plus-circle',
          onClick: function() {
            var url = App.settings.mdashURL +
                '/customer?access_token=' + props.app.state.u.token;
            return axios.get(url)
                .then(function(res) {
                  var data = res.data;
                  if (!data.pubkeys) data.pubkeys = {};
                  data.pubkeys[self.state.public_key] = {};
                  return axios({method: 'POST', url: url, data: data});
                })
                .then(function(res) {
                  var proto = App.settings.mdashURL.split(':')[0];
                  location.href =
                      proto + '://' + location.host + location.pathname;
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

App.PageDeviceSettings = function(props) {
  var self = this;
  var url = App.settings.mdashURL + '/api/v2/m/device?access_token=' + props.k;

  self.componentDidMount = function() {
    props.app.setState({title: 'Devices / '});
    self.setState({device: null, c: {}});
    self.refresh();
  };

  self.componentWillUnmount = function() {
    self.unmounted = true;
  };

  self.refresh = function() {
    return axios.get(url)
        .then(function(res) {
          self.setState({device: res.data});
          props.app.setState({title: 'Devices / ' + res.data.id});
        })
        .catch(function(err) {
          self.setState({device: {id: ''}});
        });
  };

  var mkin = function(ph) {
    return h(
        'input', {type: 'text', placeholder: ph, class: 'my-2 form-control'});
  };
  var mkrow = function(label, k, dis, c, r) {
    return h(
        'div', {class: 'form-group row my-2'},
        h('label', {class: 'col-form-label col-4'}, label),
        h('div', {class: 'col-8'}, h('input', {
            type: 'text',
            // value: state.c[k] || r.config[k] || '',
            value: App.getKey(c, k) || App.getKey(r, k) || '',
            placeholder: label,
            disabled: !!dis || !r.online,
            class: 'form-control',
            onInput: function(ev) {
              App.setKey(c, k, ev.target.value);
            },
          })));
  };

  self.render = function(props, state) {
    // if (!state.device) return 'loading ...';
    var r = (((state.device || {}).shadow || {}).state || {}).reported || {};
    return h(
        'div', {class: 'px-2 form'}, h('div', {class: 'my-1'}, '\u00a0'),
        mkrow('Name', 'name', false, state.c, r), h(App.SpinButton, {
          class: 'btn-block btn-primary mt-3',
          title: 'Save device settings',
          icon: 'fa-save',
          onClick: function() {
            var url =
                App.settings.mdashURL + '/m/device?access_token=' + props.k;
            var data = {shadow: {desired: {name: state.c.name}}};
            return axios({method: 'POST', url: url, data: data})
                .then(self.refresh)
                .catch(App.errorHandler);
          }
        }),
        h('hr'),
        h('div', {class: 'small text-muted mt-4'},
          'NOTE: device deletion cannot be undone'),
        h(App.SpinButton, {
          class: 'btn-block btn-danger mt-3',
          title: 'Delete device',
          icon: 'fa-times',
          onClick: function() {
            var url = App.settings.mdashURL +
                '/customer?access_token=' + props.app.state.u.token;
            var keys = props.app.state.u.pubkeys || {};
            delete keys[props.k];
            return axios({method: 'POST', url: url, data: {pubkeys: keys}})
                .then(function(res) {
                  props.app.setState({u: res.data});
                  preactRouter.route('');
                })
                .catch(App.errorHandler);
          }
        }));
  };
};

App.Content = function(props) {
  return h(
      preactRouter.Router, {
        history: History.createHashHistory(),
        onChange: function(ev) {
          props.app.setState({url: ev.url});
        }
      },
      h(App.PageDevices, {app: props.app, default: true}),
      h(App.PageDeviceSettings, {app: props.app, path: '/devices/:k'}),
      h(App.PageAddDevice, {app: props.app, path: 'new'}));
};

App.Instance = function(props) {
  var self = this;
  App.self = self;

  self.componentDidMount = function() {
    var access_token = location.search.substring(1) || localStorage.sltok;
    if (access_token === 'undefined') access_token = undefined;
    if (access_token) {
      var url =
          App.settings.mdashURL + '/customer?access_token=' + access_token;
      self.setState({loading: true});
      return axios.get(url)
          .then(function(res) {
            self.login(res.data);
          })
          .catch(function(e) {})
          .then(function() {
            self.setState({loading: false});
          });
    }
  };

  self.logout = function() {
    delete localStorage.sltok;
    self.setState({u: null});
    return Promise.resolve();
  };

  self.login = function(u) {
    self.setState({u: u});
    localStorage.sltok = u.token;
    if (location.search.length > 0)
      location.href = location.protocol + '//' + location.host +
          location.pathname + location.hash;
  };

  self.render = function(props, state) {
    var p = {app: self};
    if (self.state.loading) return h('div');    // Show blank page when loading
    if (!self.state.u) return h(App.Login, p);  // Show login unless logged
    return h(
        'div', {
          class: 'main border',
          style: 'max-width: 480px; margin: 0 auto; ' +
              'min-height: 100%; max-height: 100%;' +
              'display:grid;grid-template-rows: auto 1fr auto;' +
              'grid-template-columns: 100%;',
        },
        h(App.Header, p), h(App.Content, p), h(App.Footer, p));
  };

  return self.render(props, self.state);
};

window.onload = function() {
  if (!window.localStorage) alert('Unsupported platform!');
  preact.render(h(App.Instance), document.body);

  if ('serviceWorker' in navigator)  // for PWA
    navigator.serviceWorker.register('js/service-worker.js')
        .catch(function(err) {});
};
