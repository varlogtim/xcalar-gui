class DagNodeIMDTableInput extends DagNodeInput {
    protected input: DagNodeIMDTableInputStruct;

    public static readonly schema = {
        "definitions": {},
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "http://example.com/root.json",
        "type": "object",
        "title": "The Root Schema",
        "additionalProperties": false,
        "required": [
          "source",
          "version",
          "schema"
        ],
        "optional" : [
          "filterString",
          "limitedRows"
        ],
        "properties": {
          "source": {
            "$id": "#/properties/source",
            "type": "string",
            "title": "The Source Schema",
            "default": "",
            "examples": [
              "Base_table_L"
            ],
            "minLength": 1,
            "pattern": "^(.*)$"
          },
          "version": {
            "$id": "#/properties/version",
            "type": "number",
            "title": "The Version Schema",
            "default": -1,
            "examples": [
              1
            ],
            "minLength": 1,
            "pattern": "^(.*)$"
          },
          "schema": {
            "$id": "#/properties/schema",
            "type": "array",
            "title": "The schema Schema",
            "minItems": 1,
            "additionalItems": false,
            "items": {
              "$id": "#/properties/schema/items",
              "type": "object",
              "title": "The Items Schema",
              "required": [
                "name",
                "type"
              ],
              "properties": {
                "name": {
                  "$id": "#/properties/schema/items/properties/name",
                  "type": "string",
                  "minLength": 1,
                  "title": "The name Schema",
                  "default": "",
                  "examples": ["column name"],
                  "pattern": "^(.*)$"
                },
                "type": {
                  "$id": "#/properties/eval/schema/properties/type",
                  "type": "string",
                  "enum": [
                        ColumnType.integer,
                        ColumnType.float,
                        ColumnType.string,
                        ColumnType.boolean,
                        ColumnType.timestamp,
                        ColumnType.money,
                        ColumnType.mixed,
                        ColumnType.object,
                        ColumnType.array,
                        ColumnType.unknown
                    ],
                  "title": "The type Schema",
                  "default": "",
                  "examples": [
                    "integer"
                  ],
                  "minLength": 1,
                  "pattern": "^(.*)$"
                }
              }
            }
          },
          "filterString": {
            "$id": "#/properties/filterString",
            "type": "string",
            "title": "The Filterstring Schema",
            "default": "",
            "examples": [
              ""
            ],
            "pattern": "^(.*)$"
          },
          "limitedRows": {
            "$id": "#/properties/limitedRows",
            "type": "number",
            "title": "The Numer of Rows to Select",
            "examples": [
              100
            ],
            "minimum": 0,
          }
        }
    };

    public getInput(replaceParameters?: boolean): DagNodeIMDTableInputStruct {
        const input = super.getInput(replaceParameters);
        let limitedRows: number = input.limitedRows;
        if (limitedRows == null) {
          limitedRows = null; // make undefined to be null
        }
        return {
            source: input.source || "",
            version: input.version || -1,
            filterString: input.filterString || "",
            schema: input.schema || [],
            limitedRows: limitedRows,
        };
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeIMDTableInput = DagNodeIMDTableInput;
}
