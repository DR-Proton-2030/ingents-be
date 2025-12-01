export interface ICompany {
	_id?: string;
	company_name: string;
	website: string;
	logo: string;
	company_size: string;
	industry: string;
	sector: string;
	address: string;
	description: string;
	contact_email: string;
	phone_number: string;
	founding_year: number;
	services: string[];
	products: string[];
}