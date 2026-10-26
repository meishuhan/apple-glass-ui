// 丝绸流动背景（可选，默认关闭）：全屏 WebGL 片元着色器，半分辨率渲染、30fps、标签页隐藏时暂停；颜色取自当前背景预设。
(function () {
  var root = document.documentElement, cv, gl, prog, U = {}, raf = 0, last = 0, t0 = performance.now(), mx = .5, my = .5, tx = .5, ty = .5, running = false;
  var VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  var FS = 'precision mediump float;uniform vec2 R;uniform float T;uniform vec2 M;uniform vec3 c1,c2,c3,c4,base;uniform float dark;' +
    'void main(){vec2 uv=gl_FragCoord.xy/R;float asp=R.x/R.y;vec2 p=(uv-.5)*vec2(asp,1.)*2.4;vec2 m=(M-.5)*vec2(asp,1.)*2.4;' +
    'float d=length(p-m);p+=(p-m)*.45*exp(-d*d*2.2);float t=T*.06;' +
    'for(int i=1;i<5;i++){float f=float(i);p+=vec2(.55/f*sin(f*p.y+t*f+.3*f),.55/f*sin(f*p.x+t*f*1.3+.5*f));}' +
    'float a=.5+.5*sin(p.x*1.3+p.y*.9);float b=.5+.5*sin(p.y*1.6-p.x*.7+1.7);' +
    'vec3 col=mix(mix(c1,c2,a),mix(c3,c4,b),.5+.5*sin(p.x+p.y));' +
    'float ridge=pow(1.-abs(sin((p.x+p.y)*1.7)),7.);' +
    'col=mix(base,col,.78)+ridge*(dark>.5?.10:.14);gl_FragColor=vec4(col,1.);}';
  function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; }
  function rgb(name, fallback) {
    var v = getComputedStyle(root).getPropertyValue(name), m = /rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)/.exec(v);
    return m ? [m[1] / 255, m[2] / 255, m[3] / 255] : fallback;
  }
  function isDark() {
    var t = root.getAttribute('data-theme');
    return t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  }
  function colors() {
    var dark = isDark(), base = dark ? [.04, .06, .12] : [.96, .96, .98], k = dark ? .9 : .55;
    function lift(c) { return dark ? c.map(function (x) { return x * k; }) : c.map(function (x) { return x + (1 - x) * (1 - k); }); }
    gl.uniform3fv(U.c1, lift(rgb('--b1', [0, .44, .89]))); gl.uniform3fv(U.c2, lift(rgb('--b2', [.48, .36, 1])));
    gl.uniform3fv(U.c3, lift(rgb('--b3', [.2, .78, .74]))); gl.uniform3fv(U.c4, lift(rgb('--b4', [1, .62, .47])));
    gl.uniform3fv(U.base, base); gl.uniform1f(U.dark, dark ? 1 : 0);
  }
  function resize() {
    var s = .5, w = Math.max(2, Math.floor(innerWidth * s)), h = Math.max(2, Math.floor(innerHeight * s));
    cv.width = w; cv.height = h; gl.viewport(0, 0, w, h); gl.uniform2f(U.R, w, h);
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (now - last < 33) return; last = now;
    mx += (tx - mx) * .08; my += (ty - my) * .08;
    gl.uniform1f(U.T, (now - t0) / 1000); gl.uniform2f(U.M, mx, my);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function onMove(e) { tx = e.clientX / innerWidth; ty = 1 - e.clientY / innerHeight; }
  function onVis() { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else if (running && !raf) raf = requestAnimationFrame(frame); }
  var recolor = new MutationObserver(function () { if (gl) colors(); });
  window.PortalFabric = {
    supported: function () {
      try { var c = document.createElement('canvas'); return !!(c.getContext('webgl') || c.getContext('experimental-webgl')); } catch (e) { return false; }
    },
    start: function () {
      if (running) return true;
      cv = document.createElement('canvas'); cv.className = 'fabric'; cv.setAttribute('aria-hidden', 'true');
      gl = cv.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
      if (!gl) return false;
      var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS); if (!vs || !fs) return false;
      prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
      gl.useProgram(prog);
      var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      ['R', 'T', 'M', 'c1', 'c2', 'c3', 'c4', 'base', 'dark'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
      document.body.insertBefore(cv, document.body.firstChild);
      resize(); colors(); running = true; root.classList.add('fx-fabric');
      addEventListener('resize', resize); addEventListener('pointermove', onMove, { passive: true });
      document.addEventListener('visibilitychange', onVis);
      recolor.observe(root, { attributes: true, attributeFilter: ['data-theme', 'data-bg'] });
      raf = requestAnimationFrame(frame); requestAnimationFrame(function () { cv.classList.add('on'); });
      return true;
    },
    stop: function () {
      if (!running) return; running = false; cancelAnimationFrame(raf); raf = 0; recolor.disconnect();
      removeEventListener('resize', resize); removeEventListener('pointermove', onMove); document.removeEventListener('visibilitychange', onVis);
      root.classList.remove('fx-fabric'); if (cv) { cv.remove(); cv = null; }
      var ext = gl && gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); gl = null;
    }
  };
})();
