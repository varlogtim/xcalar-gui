class DagNodeIMDTable extends DagNodeIn {
    protected input: DagNodeIMDTableInput;
    protected columns: ProgCol[];

    public constructor(options: DagNodeInInfo) {
        super(options);
        this.type = DagNodeType.IMDTable;
        this.maxParents = 0;
        this.minParents = 0;
        this.display.icon = "&#xea55;";
        this.input = new DagNodeIMDTableInput(options.input);
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
            "maxItems": 0,
            "items": {
              "$id": "#/properties/parents/items",
              "type": "string",
              "pattern": "^(.*)$"
            }
          },
          "schema": {
            "$id": "#/properties/schema",
            "type": "array",
            "title": "The schema Schema",
            "minItems": 0,
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
                  "$id": "#/properties/schema/items/properties/type",
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
          }
        }
    };

    /**
     * Set dataset node's parameters
     * @param input {DagNodeIMDTableInputStruct}
     */
    public setParam(input: DagNodeIMDTableInputStruct = <DagNodeIMDTableInputStruct>{}, noAutoExecute?: boolean): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const source: string = input.source;
        const version: number = input.version;
        const filterString: string = input.filterString;
        const schema: ColSchema[] = input.schema;
        this.setSchema(schema);
        this.input.setInput({
            source: source,
            version: version,
            filterString: filterString,
            schema: schema
        });
        super.setParam(null, noAutoExecute);

        return deferred.resolve();
    }

    public getSource(): string {
        return this.getParam().source;
    }

    /**
     * @override
     */
    protected _genParamHint(): string {
        let hint: string = "";
        const input: DagNodeIMDTableInputStruct = this.getParam();
        if (input.source) {
            hint = `Source: ${input.source}`;
        }
        return hint;
    }

    protected _getColumnsUsedInInput() {
        return null;
    }
}