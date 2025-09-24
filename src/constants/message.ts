export const MESSAGE = {
	post: {
		succ: "Companies and emails processed successfully",
		fail: "Failed to process file",
        error: "Failed to generate Email for the company",
		notFound: "User's company not found",
        notUploaded: "No file uploaded",
		succAuth: "Authentication Successful!",
		succCheckout: "Checkout Successful!",
		failCheckout: "Checkout Failure!",
		succWalletUpdate: "Wallet Updated Successfully!",
		failAuth: "Login Unsuccessful!",
		custom: (msg: string) => msg
	},
	get: {
		succ: "Data fetched successfully",
		fail: "Failed to fetch data",
		empty: "Database empty",
		enough: "Not Enough Data to Fetch",
		custom: (msg: string) => msg
	},
	put: {
		succ: "Data edited successfully",
		fail: "Failed to edit data",
		custom: (msg: string) => msg
	},
	patch: {
		succ: "Data edited successfully",
		fail: "Failed to edit data",
		succAuth: "Authentication Successful!",
		failAuth: "Login Unsuccessful!",
		custom: (msg: string) => msg
	},
	delete: {
		succ: "Data deleted successfully",
		fail: "Failed to delete data",
		custom: (msg: string) => msg
	},
	error: "Error",
	none: "No such data",
	custom: (msg: string) => msg
};
