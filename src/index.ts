export class WebVTTConverter {
    private resource: Blob;
    private objectURL?: string;

    constructor(resource: Blob) {
        this.resource = resource;
    }

    blobToBuffer(): Promise<Uint8Array> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.addEventListener("loadend", (event) => {
                if (!event.target?.result || typeof event.target.result === "string") {
                    return reject("Invalid loadend event");
                }
                resolve(new Uint8Array(event.target.result));
            });
            reader.addEventListener("error", () => reject("Error while reading the Blob object"));
            reader.readAsArrayBuffer(this.resource);
        });
    }
    /**
     * @param {*} blob
     * @param {*} success
     * @param {*} fail
     */
    static blobToString(blob: Blob, success: (text: string) => void, fail: () => void): void {
        const reader = new FileReader();
        reader.addEventListener("loadend", (event) => {
            if (!event.target?.result || typeof event.target.result !== "string") {
                return fail();
            }
            const text = event.target.result;
            success(text);
        });
        reader.addEventListener("error", () => fail());
        reader.readAsText(blob);
    }
    /**
     * @param {*} utf8str
     */
    static toVTT(utf8str: string): string {
        return utf8str
            .replace(/\{\\([ibu])\}/g, "</$1>")
            .replace(/\{\\([ibu])1\}/g, "<$1>")
            .replace(/\{([ibu])\}/g, "<$1>")
            .replace(/\{\/([ibu])\}/g, "</$1>")
            .replace(/(\d\d:\d\d:\d\d),(\d\d\d)/g, "$1.$2")
            .concat("\r\n\r\n");
    }
    /**
     * @param {*} str
     */
    static toTypedArray(str: string): Uint8Array {
        const result: number[] = [];
        str.split("").forEach((each) => {
            result.push(parseInt(each.charCodeAt(0).toString(), 16));
        });
        return Uint8Array.from(result);
    }

    getURL(): Promise<string> {
        return new Promise((resolve, reject) => {
            if (!(this.resource instanceof Blob))
                return reject("Expecting resource to be a Blob but something else found.");
            if (!FileReader) return reject("No FileReader constructor found");
            if (!TextDecoder) return reject("No TextDecoder constructor found");
            return WebVTTConverter.blobToString(
                this.resource,
                (decoded) => {
                    const vttString = "WEBVTT FILE\r\n\r\n";
                    const text = vttString.concat(WebVTTConverter.toVTT(decoded));
                    const blob = new Blob([text], { type: "text/vtt" });
                    this.objectURL = URL.createObjectURL(blob);
                    return resolve(this.objectURL);
                },
                () => {
                    this.blobToBuffer().then((buffer) => {
                        const utf8str = new TextDecoder("utf-8").decode(buffer);
                        const vttString = "WEBVTT FILE\r\n\r\n";
                        const text = vttString.concat(WebVTTConverter.toVTT(utf8str));
                        const blob = new Blob([text], { type: "text/vtt" });
                        this.objectURL = URL.createObjectURL(blob);
                        return resolve(this.objectURL);
                    });
                }
            );
        });
    }

    release(): void {
        URL.createObjectURL(this.objectURL);
    }
}
