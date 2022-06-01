import zipper from "zip-local";
export const zipDirectory = async (directory: string): Promise<Buffer> => {
	return new Promise((resolve, reject) => {
		zipper.zip(directory, (error: any, zipped: any) => {
			if (!error) {
				zipped.compress(); // compress before exporting
				var buff = zipped.memory(); // get zipped file as Buffer
				resolve(buff);
			} else {
				reject();
			}
		});
	});
};
