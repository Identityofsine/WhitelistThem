"use strict";
(() => {
  // src/object/abstract/identifiable.ts
  var Identifiable = class _Identifiable {
    constructor(id, name) {
      this.uuid = "";
      this.id = "";
      this.name = "";
      this.uuid = _Identifiable.generateUUID();
      this.id = id;
      this.name = name;
    }
    static generateUUID() {
      const uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
        return (c === "x" ? Math.random() * 16 | 0 : (Math.random() * 16 | 0) & 3 | 8).toString(16);
      });
      return uuid;
    }
    compare(other) {
      return this.id === other.id;
    }
    compareUUID(other) {
      return this.uuid === other.uuid;
    }
  };
})();
//# sourceMappingURL=identifiable.js.map
