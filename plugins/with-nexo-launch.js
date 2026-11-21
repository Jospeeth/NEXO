const { withDangerousMod, withInfoPlist, IOSConfig } = require('@expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

function applyLaunchAssets(projectRoot) {
  const assetRoot = path.join(projectRoot, 'assets', 'branding');
  const iosRoot = path.join(projectRoot, 'ios', IOSConfig.XcodeUtils.getProjectName(projectRoot));
  const catalog = path.join(iosRoot, 'Images.xcassets');
  const info = { author: 'xcode', version: 1 };

  function installImages(name, extension, images) {
    const target = path.join(catalog, name + extension);
    fs.mkdirSync(target, { recursive: true });
    for (const image of images) fs.copyFileSync(path.join(assetRoot, image.filename), path.join(target, image.filename));
    fs.writeFileSync(path.join(target, 'Contents.json'), JSON.stringify({ images, info }, null, 2) + '\n');
  }

  installImages('AppIcon', '.appiconset', [{ filename: 'app-icon-ios.png', idiom: 'universal', platform: 'ios', size: '1024x1024' }]);
  installImages('NexoLaunchLogo', '.imageset', [{ filename: 'launch-logo.png', idiom: 'universal', scale: '3x' }]);
  installImages('NexoLaunchBackdrop', '.imageset', [
    { filename: 'launch-light.png', idiom: 'universal' },
    { filename: 'launch-dark.png', idiom: 'universal', appearances: [{ appearance: 'luminosity', value: 'dark' }] },
  ]);
  fs.copyFileSync(path.join(__dirname, 'nexo-launch.storyboard'), path.join(iosRoot, 'SplashScreen.storyboard'));
}

module.exports = function withNexoLaunch(config) {
  config = withInfoPlist(config, mod => {
    mod.modResults.UILaunchStoryboardName = 'SplashScreen';
    return mod;
  });
  return withDangerousMod(config, ['ios', mod => {
    applyLaunchAssets(mod.modRequest.projectRoot);
    return mod;
  }]);
};
module.exports.applyLaunchAssets = applyLaunchAssets;
