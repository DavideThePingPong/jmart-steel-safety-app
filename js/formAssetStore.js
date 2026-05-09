// Form Asset Store
// Keeps bulky form assets (currently signatures) outside the main forms node.

const FormAssetStore = {
  _extractSignatureMap: function(form) {
    if (!form || !form.id || !form.data || !form.data.signatures || typeof form.data.signatures !== 'object') {
      return null;
    }

    var signatures = {};
    Object.keys(form.data.signatures).forEach(function(name) {
      var value = form.data.signatures[name];
      if (typeof value === 'string' && value.indexOf('data:image') === 0) {
        signatures[name] = value;
      }
    });

    return Object.keys(signatures).length > 0 ? signatures : null;
  },

  collectAssetUpdates: function(forms) {
    var updates = {};
    var formsArray = Array.isArray(forms) ? forms : Object.values(forms || {});

    formsArray.forEach(function(form) {
      if (!form || !form.id) return;
      var signatures = FormAssetStore._extractSignatureMap(form);
      updates[form.id] = signatures ? {
        signatures: signatures,
        updatedAt: Date.now()
      } : null;
    });

    return updates;
  },

  stripAssetsFromForm: function(form) {
    if (!form || !form.data || !form.data.signatures || typeof form.data.signatures !== 'object') {
      return form;
    }

    var hadEmbeddedAssets = false;
    var strippedSignatures = {};

    Object.keys(form.data.signatures).forEach(function(name) {
      var value = form.data.signatures[name];
      if (typeof value === 'string' && value.indexOf('data:image') === 0) {
        hadEmbeddedAssets = true;
        strippedSignatures[name] = null;
      } else {
        strippedSignatures[name] = value;
      }
    });

    if (!hadEmbeddedAssets) return form;

    return {
      ...form,
      data: {
        ...form.data,
        signatures: strippedSignatures
      },
      _assets: {
        ...(form._assets || {}),
        signaturesStoredSeparately: true
      }
    };
  },

  stripAssetsFromForms: function(forms) {
    var formsArray = Array.isArray(forms) ? forms : Object.values(forms || {});
    return formsArray.map(function(form) {
      return FormAssetStore.stripAssetsFromForm(form);
    });
  },

  mergeAssetsIntoForm: function(form, assetRecord) {
    // Bail only when there's literally nothing to do. Note: we DO want to
    // proceed when form.data.signatures is missing/empty but the assetRecord
    // has signatures — that's the signature-restoration path after a sync
    // strips sigs out of the form body. Audit 2026-05-07 found the old
    // `!form.data.signatures` guard killed that path, so a freshly-loaded
    // form whose sigs lived only in the asset store appeared signature-less
    // until the form was touched locally.
    if (!form || !form.data || !assetRecord || !assetRecord.signatures) {
      return form;
    }
    var assetSigCount = Object.keys(assetRecord.signatures).length;
    var formSigCount = form.data.signatures ? Object.keys(form.data.signatures).length : 0;
    if (assetSigCount === 0 && formSigCount === 0) return form;

    var merged = {
      ...(form.data.signatures || {})
    };

    Object.keys(assetRecord.signatures).forEach(function(name) {
      var current = merged[name];
      if (!current || (typeof current === 'string' && current.indexOf('data:image') !== 0)) {
        merged[name] = assetRecord.signatures[name];
      }
    });

    return {
      ...form,
      data: {
        ...form.data,
        signatures: merged
      }
    };
  },

  mergeAssetMapIntoForms: function(forms, assetMap) {
    var formsArray = Array.isArray(forms) ? forms : Object.values(forms || {});
    return formsArray.map(function(form) {
      return FormAssetStore.mergeAssetsIntoForm(form, assetMap && form ? assetMap[form.id] : null);
    });
  }
};

window.FormAssetStore = FormAssetStore;
