const fromEmail = 'soporte@avilatek.com';
const clientUrl = process.env.CLIENT_URL;
const companyName = 'Avila Tek';
const companyAddress = 'La Trinidad, Caracas, Venezuela';
const supportEmail = 'soporte@avilatek.com';
const supportUrl = `${clientUrl}/support`;
const whatsappUrl = 'https://wa.me/584121267388';
const From = `Avila Tek <${fromEmail}>`;
const productImage =
  'https://cdn.hashnode.com/res/hashnode/image/upload/v1693925770100/115396eb-9dc7-4d48-bb0d-b6a2a157878e.png';

const defaultTemplateModel = {
  product_name: companyName,
  support_email: supportEmail,
  support_url: supportUrl,
  company_name: companyName,
  company_address: companyAddress,
  whatsapp_url: whatsappUrl,
  product_image: productImage,
  client_url: clientUrl,
};

export { From, defaultTemplateModel };
