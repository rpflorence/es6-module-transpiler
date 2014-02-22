import AbstractCompiler from './abstract_compiler';
import SourceModifier from './source_modifier';

class GlobalsCompiler extends AbstractCompiler {
  stringify() {
    var string = this.string.toString();  // string is actually a node buffer
    this.source = new SourceModifier(string);

    this.map = [];
    var out = this.buildPreamble(this.exports.length > 0);

    this.buildImports();
    this.buildExports();

    if (!this.options.imports) this.options.imports = {};
    if (!this.options.global) this.options.global = "window";

    out += this.indentLines();
    out += "\n})";
    out += this.buildSuffix();
    out += ";";

    return out;
  }

  buildPreamble() {
    var out = "",
        dependencyNames = this.dependencyNames;

    out += "(function(";

    if (this.exports.length > 0) {
      out += "__exports__";
      if (this.dependencyNames.length > 0) {
        out += ', ';
      }
    }

    for (var idx = 0; idx < dependencyNames.length; idx++) {
      out += `__dependency${idx+1}__`;
      this.map[dependencyNames[idx]] = idx+1;
      if (!(idx === dependencyNames.length - 1)) out += ", ";
    }

    out += ") {\n";

    out += '  "use strict";\n';

    return out;
  }

  buildSuffix() {
    var dependencyNames = this.dependencyNames;
    var out = "(";

    if (this.exports.length > 0) {
      if (!this.options.namespace) throw new Error('You must provide a namespace for the globals compiler');
      if (!this.moduleName) throw new Error('You must provide a module name for the globals compiler');
      var ns = `${this.options.global}['${this.options.namespace}']`
      out += `(${ns}||(${ns}={}))['${this.moduleName}']={}`;
      if (this.dependencyNames.length > 0) {
        out += ', ';
      }
    }

    for (var idx = 0; idx < dependencyNames.length; idx++) {
      var name = dependencyNames[idx];
      if (this.options.imports[name]) {
        out += `${this.options.imports[name] || name}`;
      } else {
        out += `${this.options.global[name]}`;
      }
      if (!(idx === dependencyNames.length - 1)) out += ", ";
    }

    out += ")";
    return out;
  }

  doModuleImport(name, dependencyName, idx) {
    return `var ${name} = __dependency${this.map[dependencyName]}__;\n`;
  }

  doBareImport(name) {
    return "";
  }

  doDefaultImport(name, dependencyName, idx) {
    return `var ${name} = __dependency${this.map[dependencyName]}__;\n`;
  }

  doNamedImport(name, dependencyName, alias) {
    return `var ${alias} = __dependency${this.map[dependencyName]}__.${name};\n`;
  }

  doExportSpecifier(name, reexport) {
    if (reexport) {
      return `__exports__.${name} = __dependency${this.map[reexport]}__.${name};\n`;
    }
    return `__exports__.${name} = ${name};\n`;
  }

  doExportDeclaration(name) {
    return `\n__exports__.${name} = ${name};`;
  }

  doDefaultExport(identifier) {
    if (identifier === null) {
      throw new Error("The globals compiler does not support anonymous default exports.");
    }
    return `__exports__.${identifier} = `;
  }

  doImportSpecifiers(import_, idx) {
    var dependencyName = import_.source.value;
    var replacement = "";
    for (var specifier of import_.specifiers) {
      var alias = specifier.name ? specifier.name.name : specifier.id.name;
      replacement += this.doNamedImport(specifier.id.name, dependencyName, alias);
    }
    return replacement;
  }

}

export default GlobalsCompiler;
