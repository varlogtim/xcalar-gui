class DagNodeExport extends DagNodeOutOptimizable {
    protected input: DagNodeExportInput;

    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.Export;
        this.display.icon = "&#xe955;";
        this.input = new DagNodeExportInput(options.input);
        this.optimized = this.subType === DagNodeSubType.ExportOptimized;
    }

    public static readonly specificSchema = {
        "definitions": {},
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "http://example.com/root.json",
        "type": "object",
        "additionalProperties": true,
        "required": [
          "parents"
        ],
        "properties": {
          "parents": {
            "$id": "#/properties/parents",
            "type": "array",
            "maxItems": 1,
            "items": {
              "$id": "#/properties/parents/items",
              "type": "string",
              "pattern": "^(.*)$"
            }
          },
          "subType": {
            "$id": "#/properties/subType",
            "type": ["string", "null"],
            "enum": [DagNodeSubType.ExportOptimized, null]
          }
        }
    };

    /**
     * Set export node's parameters
     * @param input {DagNodeExportInputStruct}
     * @param input.columns export columns's information
     * @param input.driver {string} Export driver name
     * @param input.driverArgs {ExportDriverArg[]} Driver arguments
     */
    public setParam(input: DagNodeExportInputStruct = <DagNodeExportInputStruct>{}) {
        this.input.setInput({
            columns: input.columns,
            driver: input.driver,
            driverArgs: input.driverArgs
        });
        super.setParam();
    }

    /**
     * @override
     */
    protected _genParamHint(): string {
      let hint: string = "";
      const input: DagNodeExportInputStruct = this.getParam();
      if (input.driver) {
          hint = `Driver: ${input.driver}`;
      }
      return hint;
  }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeExport = DagNodeExport;
};
