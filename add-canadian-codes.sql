-- Add Canadian Provincial Building Codes
-- This script adds Ontario, Quebec, Alberta, Saskatchewan, Manitoba codes and NECB

-- Ontario Building Code (OBC)
INSERT INTO building_codes (jurisdiction, year, documentUrl) VALUES
('Ontario Building Code', 2012, 'https://www.ontario.ca/laws/regulation/120332'),
('Ontario Building Code', 2017, 'https://www.ontario.ca/laws/regulation/170332'),
('Ontario Building Code', 2024, 'https://www.ontario.ca/laws/regulation/230332');

-- Quebec Construction Code (Code de construction du Québec - CCQ)
INSERT INTO building_codes (jurisdiction, year, documentUrl) VALUES
('Quebec Construction Code', 2015, 'https://www.rbq.gouv.qc.ca/domaines-dintervention/batiment/code-de-construction.html'),
('Quebec Construction Code', 2020, 'https://www.rbq.gouv.qc.ca/domaines-dintervention/batiment/code-de-construction.html'),
('Quebec Construction Code', 2023, 'https://www.rbq.gouv.qc.ca/domaines-dintervention/batiment/code-de-construction.html');

-- Alberta Building Code (ABC)
INSERT INTO building_codes (jurisdiction, year, documentUrl) VALUES
('Alberta Building Code', 2014, 'https://www.alberta.ca/alberta-building-code'),
('Alberta Building Code', 2019, 'https://www.alberta.ca/alberta-building-code'),
('Alberta Building Code', 2024, 'https://www.alberta.ca/alberta-building-code');

-- Saskatchewan Building Code (SBC)
INSERT INTO building_codes (jurisdiction, year, documentUrl) VALUES
('Saskatchewan Building Code', 2016, 'https://www.saskatchewan.ca/business/housing-development-and-construction/building-standards-and-licensing/building-codes'),
('Saskatchewan Building Code', 2022, 'https://www.saskatchewan.ca/business/housing-development-and-construction/building-standards-and-licensing/building-codes');

-- Manitoba Building Code (MBC)
INSERT INTO building_codes (jurisdiction, year, documentUrl) VALUES
('Manitoba Building Code', 2011, 'https://www.gov.mb.ca/mr/bldgcode/'),
('Manitoba Building Code', 2020, 'https://www.gov.mb.ca/mr/bldgcode/');

-- National Energy Code for Buildings (NECB)
INSERT INTO building_codes (jurisdiction, year, documentUrl) VALUES
('National Energy Code for Buildings', 2015, 'https://nrc.canada.ca/en/certifications-evaluations-standards/codes-canada/codes-canada-publications/national-energy-code-canada-buildings-2015'),
('National Energy Code for Buildings', 2017, 'https://nrc.canada.ca/en/certifications-evaluations-standards/codes-canada/codes-canada-publications/national-energy-code-canada-buildings-2017'),
('National Energy Code for Buildings', 2020, 'https://nrc.canada.ca/en/certifications-evaluations-standards/codes-canada/codes-canada-publications/national-energy-code-canada-buildings-2020');
