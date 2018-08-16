class OpPanelArg {
    private value: string;
    private formattedValue: string;
    private cast: XcCast;
    private typeid: number;
    private isValid: boolean;
    private isNone: boolean = false;
    private isEmptyString: boolean = false;
    private isRegex: boolean = false;
    private type: string; // ("value" | "column" | "function" | "regex")
    private error: string;

    constructor(value: string, typeid: number, isRestoring?: boolean) {
        this.value = value;
        this.formattedValue = value;
        this.cast = null;
        this.typeid = typeid;
        this.isValid = false;
        if (!isRestoring) {
            this.error = "No value";
            this.type = "value";
        }
    }

    public getValue(): string {
        return this.value;
    }

    public setValue(value: string): void {
        this.value = value;
    }

    public setTypeid(typeid: number): void {
        this.typeid = typeid;
    }

    public getTypeid(): number {
        return this.typeid;
    }

    public setFormattedValue(value: string): void {
        this.formattedValue = value;
    }

    public getFormattedValue(): string {
        return this.formattedValue;
    }

    public setRegex(isRegex: boolean): void {
        this.isRegex = isRegex;
    }

    public checkIsRegex(): boolean {
        return this.isRegex;
    }

    public hasNoneChecked(): boolean {
        return this.isNone;
    }

    public checkIsEmptyString(): boolean {
        return this.isEmptyString;
    }

    public setIsEmptyString(isEmptyString: boolean): void {
        this.isEmptyString = isEmptyString;
    }

    public setType(type: OpPanelArgType): void {
        this.type = type;
    }

    public getType(): string {
        return this.type;
    }

    public setIsNone(isNone: boolean): void {
        this.isNone = isNone;
    }

    public setCast(castType: ColumnType): void {
        this.cast = castType;
    }

    public isCast(): boolean {
        return this.cast != null;
    }

    public getCast(): string {
        return this.cast;
    }

    public clearError(): void {
        this.error = null;
        this.isValid = true;
    }

    public setError(error: string): void {
        this.error = error;
        this.isValid = false;
    }

    public getError(): string {
        return this.error;
    }

    public checkIsValid(): boolean {
        return this.isValid;
    }
}

