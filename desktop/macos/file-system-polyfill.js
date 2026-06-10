/* global Blob, DOMException, File, atob, btoa, window */
(() => {
  if (window.showOpenFilePicker && window.showSaveFilePicker) return;

  const NATIVE_FILE_SYSTEM_PROVIDER = 'native-file-system';
  const postNative = (payload) =>
    window.webkit.messageHandlers.nativeFileSystem.postMessage(payload);
  const abortError = () => new DOMException('The operation was aborted.', 'AbortError');
  const bytesToBase64 = (bytes) => {
    let binary = '';
    for (let index = 0; index < bytes.length; index += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
    }
    return btoa(binary);
  };
  const base64ToBytes = (base64) => Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  const acceptFromTypes = (types = []) =>
    Object.assign({}, ...types.map((type) => type.accept || {}));

  class NativeFileHandle {
    constructor(file) {
      this.kind = 'file';
      this.name = file.name;
      this._id = file.id;
      this._bookmark = file.bookmark || null;
      this._data = file.data || null;
    }

    async getFile() {
      if (!this._data) {
        const result = await postNative({
          action: 'read',
          bookmark: this._bookmark,
          id: this._id,
        });
        this._id = result.id || this._id;
        this._bookmark = result.bookmark || this._bookmark;
        this._data = result.data || null;
        this.name = result.name || this.name;
      }

      const bytes = base64ToBytes(this._data || '');
      return new File([bytes], this.name);
    }

    async createWritable() {
      const chunks = [];
      return {
        write: async (chunk) => chunks.push(chunk),
        close: async () => {
          const blob = new Blob(chunks);
          const bytes = new Uint8Array(await blob.arrayBuffer());
          const result = await postNative({
            action: 'write',
            bookmark: this._bookmark,
            data: bytesToBase64(bytes),
            id: this._id,
            name: this.name,
          });
          this._id = result.id || this._id;
          this._bookmark = result.bookmark || this._bookmark;
          this._data = bytesToBase64(bytes);
        },
        abort: async () => {},
      };
    }

    async isSameEntry(other) {
      return Boolean(
        other &&
        other.kind === 'file' &&
        other.__nativeFileSystemProvider === NATIVE_FILE_SYSTEM_PROVIDER &&
        other._bookmark === this._bookmark &&
        other.name === this.name
      );
    }

    async queryPermission() {
      return 'granted';
    }

    async requestPermission() {
      return 'granted';
    }
  }

  NativeFileHandle.prototype.__nativeFileSystemProvider = NATIVE_FILE_SYSTEM_PROVIDER;

  window.__nativeFileSystem = {
    async findDefaultFileHandle(fileName) {
      const result = await postNative({
        action: 'openDefault',
        fileName,
      });
      if (!result || result.missing) {
        return null;
      }

      return new NativeFileHandle(result);
    },
    isNativeFileHandle(handle) {
      return (
        handle instanceof NativeFileHandle ||
        handle?.__nativeFileSystemProvider === NATIVE_FILE_SYSTEM_PROVIDER
      );
    },
    restoreFileHandle(serialized) {
      if (
        !serialized ||
        serialized.provider !== NATIVE_FILE_SYSTEM_PROVIDER ||
        serialized.kind !== 'file' ||
        typeof serialized.id !== 'string' ||
        typeof serialized.name !== 'string'
      ) {
        return null;
      }

      return new NativeFileHandle({
        bookmark: serialized.bookmark || null,
        id: serialized.id,
        name: serialized.name,
      });
    },
    serializeFileHandle(handle) {
      if (!(handle instanceof NativeFileHandle)) {
        return null;
      }

      return {
        provider: NATIVE_FILE_SYSTEM_PROVIDER,
        kind: 'file',
        id: handle._id,
        name: handle.name,
        bookmark: handle._bookmark || undefined,
      };
    },
  };

  window.showOpenFilePicker = async (options = {}) => {
    const result = await postNative({
      action: 'open',
      multiple: Boolean(options.multiple),
      accept: acceptFromTypes(options.types),
    });
    if (result.cancelled) throw abortError();
    return result.files.map((file) => new NativeFileHandle(file));
  };

  window.showSaveFilePicker = async (options = {}) => {
    const result = await postNative({
      action: 'save',
      suggestedName: options.suggestedName,
      accept: acceptFromTypes(options.types),
    });
    if (result.cancelled) throw abortError();
    return new NativeFileHandle(result);
  };
})();
