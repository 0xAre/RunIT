const fs = require('fs');
const path = require('path');

function copyInsteadOfSymlink(target, linkPath) {
  fs.mkdirSync(path.dirname(linkPath), { recursive: true });
  if (fs.existsSync(linkPath)) {
    fs.rmSync(linkPath, { recursive: true, force: true });
  }
  fs.cpSync(target, linkPath, { recursive: true, force: true });
}

const originalSymlinkSync = fs.symlinkSync;
fs.symlinkSync = function patchedSymlinkSync(target, linkPath, type) {
  try {
    return originalSymlinkSync.call(this, target, linkPath, type);
  } catch (error) {
    if (error && error.code === 'EPERM') {
      return copyInsteadOfSymlink(target, linkPath);
    }
    throw error;
  }
};

const originalSymlink = fs.symlink;
fs.symlink = function patchedSymlink(target, linkPath, type, callback) {
  const cb = typeof type === 'function' ? type : callback;
  const linkType = typeof type === 'function' ? undefined : type;

  originalSymlink.call(this, target, linkPath, linkType, (error) => {
    if (error && error.code === 'EPERM') {
      try {
        copyInsteadOfSymlink(target, linkPath);
        if (cb) cb(null);
        return;
      } catch (copyError) {
        if (cb) cb(copyError);
        return;
      }
    }
    if (cb) cb(error);
  });
};

const originalPromiseSymlink = fs.promises.symlink.bind(fs.promises);
fs.promises.symlink = async function patchedPromiseSymlink(target, linkPath, type) {
  try {
    return await originalPromiseSymlink(target, linkPath, type);
  } catch (error) {
    if (error && error.code === 'EPERM') {
      copyInsteadOfSymlink(target, linkPath);
      return;
    }
    throw error;
  }
};
