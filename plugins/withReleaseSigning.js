// Signs `assembleRelease` with the release keystore when these env vars are set
// (the GitHub Actions workflow sets them from repository secrets):
//   ANDROID_KEYSTORE_PATH, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD
// Without them the release build falls back to the debug key, so local builds still work.
const { withAppBuildGradle } = require('expo/config-plugins');

const SIGNING_BLOCK = `
        release {
            if (System.getenv("ANDROID_KEYSTORE_PATH")) {
                storeFile file(System.getenv("ANDROID_KEYSTORE_PATH"))
                storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
                keyAlias System.getenv("ANDROID_KEY_ALIAS")
                keyPassword System.getenv("ANDROID_KEY_PASSWORD")
            }
        }`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let gradle = cfg.modResults.contents;
    if (gradle.includes('ANDROID_KEYSTORE_PATH')) return cfg;

    // 1. Add a `release` signing config next to the generated `debug` one.
    gradle = gradle.replace(/signingConfigs\s*\{/, (m) => `${m}${SIGNING_BLOCK}`);

    // 2. Point the release build type at it when the keystore is provided.
    gradle = gradle.replace(
      /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig\s+signingConfigs\.debug/,
      `$1signingConfig System.getenv("ANDROID_KEYSTORE_PATH") ? signingConfigs.release : signingConfigs.debug`,
    );

    if (!gradle.includes('signingConfigs.release')) {
      throw new Error('withReleaseSigning: could not find the release signingConfig in app/build.gradle');
    }
    cfg.modResults.contents = gradle;
    return cfg;
  });
};
