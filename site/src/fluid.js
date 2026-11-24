/* Real-time liquid paint: a Navier-Stokes fluid solved on the GPU, shaded as a glossy wet surface.
   createFluid(canvas, options) returns null when the browser cannot run it (the CSS background stays). */
function createFluid(canvas, opt) {
  var cfg = { sim: 128, dye: 1024, iter: 18, curl: 6, pressure: 0.8, velDiss: 0.5, dyeDiss: 0.2 };
  for (var k in opt) cfg[k] = opt[k];
  var params = { alpha: false, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' };
  var gl = canvas.getContext('webgl2', params), gl2 = !!gl;
  if (!gl) gl = canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params);
  if (!gl) return null;

  var HF, linear = true;
  if (gl2) { gl.getExtension('EXT_color_buffer_float'); HF = gl.HALF_FLOAT; }
  else {
    var e = gl.getExtension('OES_texture_half_float'); if (!e) return null;
    HF = e.HALF_FLOAT_OES; linear = !!gl.getExtension('OES_texture_half_float_linear');
  }
  function fboOK(internal, format) {
    var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, 4, 4, 0, format, HF, null);
    var f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    var ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.deleteTexture(t); gl.deleteFramebuffer(f); return ok;
  }
  var F4, F2;
  if (gl2) { if (!fboOK(gl.RGBA16F, gl.RGBA)) return null; F4 = [gl.RGBA16F, gl.RGBA]; F2 = fboOK(gl.RG16F, gl.RG) ? [gl.RG16F, gl.RG] : F4; }
  else { if (!fboOK(gl.RGBA, gl.RGBA)) return null; F4 = F2 = [gl.RGBA, gl.RGBA]; }

  var VS = 'precision highp float;attribute vec2 aPos;varying vec2 vUv,vL,vR,vT,vB;uniform vec2 texel;' +
    'void main(){vUv=aPos*.5+.5;vL=vUv-vec2(texel.x,0.);vR=vUv+vec2(texel.x,0.);vT=vUv+vec2(0.,texel.y);vB=vUv-vec2(0.,texel.y);gl_Position=vec4(aPos,0.,1.);}';
  var HEAD = 'precision highp float;precision highp sampler2D;varying vec2 vUv,vL,vR,vT,vB;';
  var FS = {
    clear: HEAD + 'uniform sampler2D uTex;uniform float value;void main(){gl_FragColor=value*texture2D(uTex,vUv);}',
    splat: HEAD + 'uniform sampler2D uTex;uniform float aspect,radius;uniform vec3 color;uniform vec2 point;' +
      'void main(){vec2 p=vUv-point;p.x*=aspect;vec3 s=exp(-dot(p,p)/radius)*color;gl_FragColor=vec4(texture2D(uTex,vUv).xyz+s,1.);}',
    advect: HEAD + 'uniform sampler2D uVel,uSrc;uniform vec2 texel,srcTexel;uniform float dt,diss;' +
      (linear ? '' : 'vec4 bl(sampler2D s,vec2 uv,vec2 ts){vec2 st=uv/ts-.5;vec2 i=floor(st),f=fract(st);' +
        'vec4 a=texture2D(s,(i+vec2(.5,.5))*ts),b=texture2D(s,(i+vec2(1.5,.5))*ts),c=texture2D(s,(i+vec2(.5,1.5))*ts),d=texture2D(s,(i+vec2(1.5,1.5))*ts);' +
        'return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}') +
      'void main(){' + (linear
        ? 'vec2 c=vUv-dt*texture2D(uVel,vUv).xy*texel;vec4 r=texture2D(uSrc,c);'
        : 'vec2 c=vUv-dt*bl(uVel,vUv,texel).xy*texel;vec4 r=bl(uSrc,c,srcTexel);') +
      'gl_FragColor=r/(1.+diss*dt);}',
    div: HEAD + 'uniform sampler2D uVel;void main(){float L=texture2D(uVel,vL).x,R=texture2D(uVel,vR).x,T=texture2D(uVel,vT).y,B=texture2D(uVel,vB).y;vec2 C=texture2D(uVel,vUv).xy;' +
      'if(vL.x<0.)L=-C.x;if(vR.x>1.)R=-C.x;if(vT.y>1.)T=-C.y;if(vB.y<0.)B=-C.y;gl_FragColor=vec4(.5*(R-L+T-B),0.,0.,1.);}',
    curl: HEAD + 'uniform sampler2D uVel;void main(){float L=texture2D(uVel,vL).y,R=texture2D(uVel,vR).y,T=texture2D(uVel,vT).x,B=texture2D(uVel,vB).x;gl_FragColor=vec4(.5*(R-L-T+B),0.,0.,1.);}',
    vort: HEAD + 'uniform sampler2D uVel,uCurl;uniform float curl,dt;void main(){float L=texture2D(uCurl,vL).x,R=texture2D(uCurl,vR).x,T=texture2D(uCurl,vT).x,B=texture2D(uCurl,vB).x,C=texture2D(uCurl,vUv).x;' +
      'vec2 f=.5*vec2(abs(T)-abs(B),abs(R)-abs(L));f/=length(f)+.0001;f*=curl*C;f.y*=-1.;vec2 v=texture2D(uVel,vUv).xy+f*dt;gl_FragColor=vec4(clamp(v,-1000.,1000.),0.,1.);}',
    press: HEAD + 'uniform sampler2D uP,uDiv;void main(){float L=texture2D(uP,vL).x,R=texture2D(uP,vR).x,T=texture2D(uP,vT).x,B=texture2D(uP,vB).x;gl_FragColor=vec4((L+R+B+T-texture2D(uDiv,vUv).x)*.25,0.,0.,1.);}',
    grad: HEAD + 'uniform sampler2D uP,uVel;void main(){float L=texture2D(uP,vL).x,R=texture2D(uP,vR).x,T=texture2D(uP,vT).x,B=texture2D(uP,vB).x;vec2 v=texture2D(uVel,vUv).xy-vec2(R-L,T-B);gl_FragColor=vec4(v,0.,1.);}',
    /* The look: pigment thickness is treated as a height field. Normals from that height give a glossy,
       wet surface with a studio soft-box reflection and a tight specular, over a deep-water blue. */
    show: HEAD + 'uniform sampler2D uDye;uniform vec2 texel;uniform float uTime,uPortrait,uScrim,uAspect;' +
      'float H(vec3 d){return d.r*.75+d.g*1.1;}' +
      'float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}' +
      'void main(){vec3 d=texture2D(uDye,vUv).rgb;vec2 o=texel*2.6,k=o*.7071;' +
      'float hL=H(texture2D(uDye,vUv-vec2(o.x,0.)).rgb),hR=H(texture2D(uDye,vUv+vec2(o.x,0.)).rgb),hT=H(texture2D(uDye,vUv+vec2(0.,o.y)).rgb),hB=H(texture2D(uDye,vUv-vec2(0.,o.y)).rgb);' +
      'float hTL=H(texture2D(uDye,vUv+vec2(-k.x,k.y)).rgb),hTR=H(texture2D(uDye,vUv+k).rgb),hBL=H(texture2D(uDye,vUv-k).rgb),hBR=H(texture2D(uDye,vUv+vec2(k.x,-k.y)).rgb);' +
      'float gx=(hL-hR)*2.+(hTL+hBL-hTR-hBR),gy=(hB-hT)*2.+(hBL+hBR-hTL-hTR);' +
      'vec3 n=normalize(vec3(gx*.25,gy*.25,.13));' +
      'float b=d.r,w=clamp(d.g,0.,1.4);' +
      'vec3 deep=vec3(.020,.070,.160),mid=vec3(.055,.270,.640),hi=vec3(.180,.520,.950),pale=vec3(.640,.840,1.);' +
      'vec3 col=mix(deep,mid,smoothstep(0.,.5,b));col=mix(col,hi,smoothstep(.4,1.05,b));col=mix(col,pale,smoothstep(1.,1.9,b)*.75);' +
      'col=mix(col,vec3(.965,.955,.925),smoothstep(.06,.85,w)*.94);' +
      'vec3 Ld=normalize(vec3(-.45,.6,.66)),V=vec3(0.,0.,1.),Hv=normalize(Ld+V);' +
      'float diff=clamp(dot(n,Ld),0.,1.);float spec=pow(clamp(dot(n,Hv),0.,1.),70.);' +
      'vec3 r=reflect(-V,n);float box=smoothstep(.16,.42,r.y)*smoothstep(.86,.5,r.y)*smoothstep(.75,.1,abs(r.x+.12));float rim=smoothstep(.05,.5,-r.x)*smoothstep(.5,.0,abs(r.y));' +
      'float wet=smoothstep(.02,.5,H(d));' +
      'col=col*(.66+.46*diff)+vec3(.86,.93,1.)*box*.5*wet+vec3(.5,.68,1.)*rim*.12*wet+vec3(1.)*spec*.6*wet;' +
      'float sx=smoothstep(.82,.08,vUv.x),sy=smoothstep(.2,.8,vUv.y);float s=mix(sx,sy*.38+.62,uPortrait);col=mix(col,deep*.85,s*uScrim);' +
      'vec2 q=vUv-.5;col*=1.-dot(q,q)*.55;' +
      'col+=(hash(vUv*vec2(1387.,911.)+uTime)-.5)*.018;' +
      'gl_FragColor=vec4(pow(max(col,0.),vec3(.92)),1.);}'
  };
  function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
  var vs;
  function prog(fs) {
    var p = gl.createProgram(); gl.attachShader(p, vs); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.bindAttribLocation(p, 0, 'aPos'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    var u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < n; i++) { var nm = gl.getActiveUniform(p, i).name; u[nm] = gl.getUniformLocation(p, nm); }
    return { p: p, u: u };
  }
  var P = {};
  try { vs = sh(gl.VERTEX_SHADER, VS); for (var name in FS) P[name] = prog(FS[name]); } catch (err) { if (window.console) console.warn('fluid shader', err); return null; }

  var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  function blit(t) { if (t) { gl.viewport(0, 0, t.w, t.h); gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo); } else { gl.viewport(0, 0, canvas.width, canvas.height); gl.bindFramebuffer(gl.FRAMEBUFFER, null); } gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); }
  function fbo(w, h, fmt, filter) {
    gl.activeTexture(gl.TEXTURE0); var tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, fmt[0], w, h, 0, fmt[1], HF, null);
    var f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    return { tex: tex, fbo: f, w: w, h: h, tx: 1 / w, ty: 1 / h, bind: function (id) { gl.activeTexture(gl.TEXTURE0 + id); gl.bindTexture(gl.TEXTURE_2D, tex); return id; } };
  }
  function dbl(w, h, fmt, filter) { var a = fbo(w, h, fmt, filter), b = fbo(w, h, fmt, filter); return { w: w, h: h, tx: 1 / w, ty: 1 / h, read: a, write: b, swap: function () { var t = this.read; this.read = this.write; this.write = t; } }; }
  function res(r) { var a = canvas.width / canvas.height; if (a < 1) a = 1 / a; var mn = Math.round(r), mx = Math.round(r * a); return canvas.width > canvas.height ? [mx, mn] : [mn, mx]; }
  function kill(t) { if (!t) return; (t.read ? [t.read, t.write] : [t]).forEach(function (x) { gl.deleteTexture(x.tex); gl.deleteFramebuffer(x.fbo); }); }

  var vel, dye, divF, curlF, pres, LIN = linear ? gl.LINEAR : gl.NEAREST;
  function build() {
    kill(vel); kill(dye); kill(divF); kill(curlF); kill(pres);
    var s = res(cfg.sim), d = res(cfg.dye);
    vel = dbl(s[0], s[1], F2, LIN); dye = dbl(d[0], d[1], F4, LIN);
    divF = fbo(s[0], s[1], F2, gl.NEAREST); curlF = fbo(s[0], s[1], F2, gl.NEAREST); pres = dbl(s[0], s[1], F2, gl.NEAREST);
  }
  build();

  function use(p) { gl.useProgram(p.p); return p.u; }
  function step(dt) {
    var u;
    gl.disable(gl.BLEND);
    u = use(P.curl); gl.uniform2f(u.texel, vel.tx, vel.ty); gl.uniform1i(u.uVel, vel.read.bind(0)); blit(curlF);
    u = use(P.vort); gl.uniform2f(u.texel, vel.tx, vel.ty); gl.uniform1i(u.uVel, vel.read.bind(0)); gl.uniform1i(u.uCurl, curlF.bind(1)); gl.uniform1f(u.curl, cfg.curl); gl.uniform1f(u.dt, dt); blit(vel.write); vel.swap();
    u = use(P.div); gl.uniform2f(u.texel, vel.tx, vel.ty); gl.uniform1i(u.uVel, vel.read.bind(0)); blit(divF);
    u = use(P.clear); gl.uniform1i(u.uTex, pres.read.bind(0)); gl.uniform1f(u.value, cfg.pressure); blit(pres.write); pres.swap();
    u = use(P.press); gl.uniform2f(u.texel, vel.tx, vel.ty); gl.uniform1i(u.uDiv, divF.bind(0));
    for (var i = 0; i < cfg.iter; i++) { gl.uniform1i(u.uP, pres.read.bind(1)); blit(pres.write); pres.swap(); }
    u = use(P.grad); gl.uniform2f(u.texel, vel.tx, vel.ty); gl.uniform1i(u.uP, pres.read.bind(0)); gl.uniform1i(u.uVel, vel.read.bind(1)); blit(vel.write); vel.swap();
    u = use(P.advect); gl.uniform2f(u.texel, vel.tx, vel.ty); if (u.srcTexel) gl.uniform2f(u.srcTexel, vel.tx, vel.ty);
    gl.uniform1i(u.uVel, vel.read.bind(0)); gl.uniform1i(u.uSrc, vel.read.bind(0)); gl.uniform1f(u.dt, dt); gl.uniform1f(u.diss, cfg.velDiss); blit(vel.write); vel.swap();
    if (u.srcTexel) gl.uniform2f(u.srcTexel, dye.tx, dye.ty);
    gl.uniform1i(u.uVel, vel.read.bind(0)); gl.uniform1i(u.uSrc, dye.read.bind(1)); gl.uniform1f(u.diss, cfg.dyeDiss); blit(dye.write); dye.swap();
  }
  /* x,y in 0..1 (y up). dx,dy = velocity push. col = [blue pigment, white pigment, 0]. r = radius (fraction of the short side, squared falloff). */
  function splat(x, y, dx, dy, col, r) {
    var a = canvas.width / canvas.height, rad = (r || 0.0025) * (a > 1 ? a : 1);
    var u = use(P.splat); gl.uniform1f(u.aspect, a); gl.uniform2f(u.point, x, y); gl.uniform1f(u.radius, rad);
    gl.uniform1i(u.uTex, vel.read.bind(0)); gl.uniform3f(u.color, dx, dy, 0); blit(vel.write); vel.swap();
    if (col) { gl.uniform1i(u.uTex, dye.read.bind(0)); gl.uniform3f(u.color, col[0], col[1], col[2] || 0); blit(dye.write); dye.swap(); }
  }
  function render(time, portrait, scrim) {
    var u = use(P.show); gl.uniform2f(u.texel, dye.tx, dye.ty); gl.uniform1i(u.uDye, dye.read.bind(0));
    gl.uniform1f(u.uTime, time % 100); gl.uniform1f(u.uPortrait, portrait ? 1 : 0); gl.uniform1f(u.uScrim, scrim); gl.uniform1f(u.uAspect, canvas.width / canvas.height);
    blit(null);
  }
  var lost = false;
  canvas.addEventListener('webglcontextlost', function (ev) { ev.preventDefault(); lost = true; });
  return { step: step, splat: splat, render: render, rebuild: build, isLost: function () { return lost; } };
}
