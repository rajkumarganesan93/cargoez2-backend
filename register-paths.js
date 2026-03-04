const Module = require('module');
const path = require('path');

const distRoot = path.join(__dirname, 'dist', 'libs');
const origResolve = Module._resolveFilename;

Module._resolveFilename = function (request, parent, isMain, options) {
  if (request.startsWith('@cargoez/')) {
    const libName = request.replace('@cargoez/', '');
    const mapped = path.join(distRoot, libName);
    return origResolve.call(this, mapped, parent, isMain, options);
  }
  return origResolve.call(this, request, parent, isMain, options);
};
