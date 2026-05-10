const baseFields = [
    { name: "name", label: "Name", required: true },
    { name: "mindbody_id", label: "MindBody ID" },
    { name: "mindbody_name", label: "MindBody Name" },
    { name: "normalized_name", label: "Normalized Name" },
    { name: "description", label: "Description", multiline: true },
    { name: "active", label: "Active", type: "boolean" },
];

const siteScopedFields = [
    { name: "site", label: "Site", type: "site", required: true },
    ...baseFields,
];

export const dataResources = {
    sites: {
        label: "Sites",
        singular: "Site",
        endpoint: "sites",
        columns: [
            { label: "Name", field: "name" },
            { label: "Country", field: "country_code" },
            { label: "MindBody Site ID", field: "mindbody_site_id" },
            { label: "Active", field: "active" },
        ],
        fields: [
            { name: "name", label: "Name", required: true },
            {
                name: "country_code",
                label: "Country",
                type: "select",
                required: true,
                options: [
                    { value: "DO", label: "Dominican Republic" },
                    { value: "ES", label: "Spain" },
                ],
            },
            { name: "mindbody_site_id", label: "MindBody Site ID" },
            { name: "description", label: "Description", multiline: true },
            { name: "active", label: "Active", type: "boolean" },
        ],
    },
    studios: {
        label: "Studios",
        singular: "Studio",
        endpoint: "studios",
        columns: [
            { label: "Name", field: "name" },
            { label: "Site", field: "site_name" },
            { label: "MindBody Name", field: "mindbody_name" },
            { label: "Active", field: "active" },
        ],
        fields: siteScopedFields,
    },
    clients: {
        label: "Clients",
        singular: "Client",
        endpoint: "clients",
        columns: [
            { label: "Name", field: "name" },
            { label: "First Name", field: "first_name" },
            { label: "Last Name", field: "last_name" },
            { label: "Site", field: "site_name" },
            { label: "MindBody ID", field: "mindbody_id" },
            { label: "Email", field: "email" },
            { label: "Phone", field: "phone" },
            { label: "Active", field: "active" },
        ],
        fields: [
            ...siteScopedFields,
            { name: "first_name", label: "First Name" },
            { name: "last_name", label: "Last Name" },
            { name: "email", label: "Email", type: "email" },
            { name: "phone", label: "Phone" },
        ],
    },
    "staff-members": {
        label: "Staff",
        singular: "Staff Member",
        endpoint: "staff-members",
        columns: [
            { label: "Name", field: "name" },
            { label: "First Name", field: "first_name" },
            { label: "Last Name", field: "last_name" },
            { label: "Site", field: "site_name" },
            { label: "MindBody Name", field: "mindbody_name" },
            { label: "Active", field: "active" },
        ],
        fields: [
            ...siteScopedFields,
            { name: "first_name", label: "First Name" },
            { name: "last_name", label: "Last Name" },
        ],
    },
    "service-categories": {
        label: "Service Categories",
        singular: "Service Category",
        endpoint: "service-categories",
        columns: [
            { label: "Name", field: "name" },
            { label: "Site", field: "site_name" },
            { label: "MindBody Name", field: "mindbody_name" },
            { label: "Active", field: "active" },
        ],
        fields: siteScopedFields,
    },
    "pricing-options": {
        label: "Pricing Options",
        singular: "Pricing Option",
        endpoint: "pricing-options",
        columns: [
            { label: "Name", field: "name" },
            { label: "Site", field: "site_name" },
            { label: "Service Category", field: "service_category_name" },
            { label: "MindBody Name", field: "mindbody_name" },
            { label: "Active", field: "active" },
        ],
        fields: [
            ...siteScopedFields,
            { name: "service_category", label: "Service Category", type: "serviceCategory" },
        ],
    },
    "payment-methods": {
        label: "Payment Methods",
        singular: "Payment Method",
        endpoint: "payment-methods",
        columns: [
            { label: "Name", field: "name" },
            { label: "Site", field: "site_name" },
            { label: "MindBody Name", field: "mindbody_name" },
            { label: "Active", field: "active" },
        ],
        fields: siteScopedFields,
    },
};

export const dataResourceList = Object.entries(dataResources).map(([key, value]) => ({
    key,
    ...value,
}));
