// in this transformer we have to split up classes and function declarations
// from their exports. why? because sometimes we need to replace classes with
// nodes that aren't allowed in the same contexts. also, if you're exporting
// a generator function as a default then regenerator will destroy the export
// declaration and leave a variable declaration in it's place... yeah, handy.

import * as t from "../../../types";

export function check(node) {
  return t.isImportDeclaration(node) || t.isExportDeclaration(node);
}

export function ImportDeclaration(node, parent, scope, file) {
  if (node.source) {
    node.source.value = file.resolveModuleSource(node.source.value);
  }
}

export function ExportDefaultDeclaration(node, parent, scope) {
  ImportDeclaration.apply(this, arguments);

  var declar = node.declaration;

  var getDeclar = function () {
    declar._ignoreUserWhitespace = true;
    return declar;
  };

  if (t.isClassDeclaration(declar)) {
    // export default class Foo {};
    node.declaration = declar.id;
    return [getDeclar(), node];
  } else if (t.isClassExpression(declar)) {
    // export default class {};
    var temp = scope.generateUidIdentifier("default");
    declar = t.variableDeclaration("var", [
      t.variableDeclarator(temp, declar)
    ]);
    node.declaration = temp;
    return [getDeclar(), node];
  } else if (t.isFunctionDeclaration(declar)) {
    // export default function Foo() {}
    node._blockHoist = 2;
    node.declaration = declar.id;
    return [getDeclar(), node];
  }
}

export function ExportNamedDeclaration(node, parent, scope) {
  ImportDeclaration.apply(this, arguments);

  var declar = node.declaration;

  var getDeclar = function () {
    declar._ignoreUserWhitespace = true;
    return declar;
  };

  if (t.isClassDeclaration(declar)) {
    // export class Foo {}
    node.specifiers  = [t.exportSpecifier(declar.id, declar.id)];
    node.declaration = null;
    return [getDeclar(), node];
  } else if (t.isFunctionDeclaration(declar)) {
    // export function Foo() {}
    node.specifiers  = [t.exportSpecifier(declar.id, declar.id)];
    node.declaration = null;
    node._blockHoist = 2;
    return [getDeclar(), node];
  } else if (t.isVariableDeclaration(declar)) {
    // export var foo = "bar";
    var specifiers = [];
    var bindings = this.get("declaration").getBindingIdentifiers();
    for (var key in bindings) {
      var id = bindings[key];
      specifiers.push(t.exportSpecifier(id, id));
    }
    return [declar, t.exportNamedDeclaration(null, specifiers)];
  }
}
