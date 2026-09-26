import {
  ADMINISTRATIVE_UNITS,
  DEFAULT_PROVINCE_CODE,
  DEFAULT_WARD_CODE,
  DEFAULT_PROVINCE_NAME,
  DEFAULT_WARD_NAME,
  AddressSchema,
  getProvinces,
  getProvinceByCode,
  getProvinceByName,
  getWardsByProvince,
  getWardByCode,
  formatAddress,
  parseAddressString,
} from '../src/utils/address';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

console.log('=== RUNNING ADDRESS MODULE UNIT TESTS ===\n');

// 1. Data Integrity: 34 Provinces
const provinces = getProvinces();
assert(provinces.length === 34, `Expected 34 provinces, got ${provinces.length}`);
assert(provinces[0].code === DEFAULT_PROVINCE_CODE, `First province should be Da Nang (21), got ${provinces[0].code}`);

// 2. Data Integrity: Exactly 3,321 Wards
const totalWards = provinces.reduce((sum, p) => sum + p.wards.length, 0);
assert(totalWards === 3321, `Expected 3,321 wards in total, got ${totalWards}`);

// 3. Da Nang specifics
const daNangWards = getWardsByProvince(DEFAULT_PROVINCE_CODE);
assert(daNangWards.length === 94, `Da Nang should have 94 wards, got ${daNangWards.length}`);
const lienChieu = daNangWards.find((w) => w.code === DEFAULT_WARD_CODE);
assert(Boolean(lienChieu && lienChieu.name === 'Phường Liên Chiểu'), 'Lien Chieu ward must exist with code 50109010');

// 4. Special Zones (13 Dac khu)
const allDacKhu: { prov: string; ward: string; code: string }[] = [];
for (const p of provinces) {
  for (const w of p.wards) {
    if (w.name.includes('Đặc khu')) {
      allDacKhu.push({ prov: p.name, ward: w.name, code: w.code });
    }
  }
}
assert(allDacKhu.length === 13, `Expected 13 Dac khu, got ${allDacKhu.length}`);
console.log(`Found ${allDacKhu.length} Đặc khu:`, allDacKhu.map((d) => `${d.ward} (${d.prov})`).join(', '));

// 5. Cascading Behavior
const emptyWards = getWardsByProvince('');
assert(emptyWards.length === 0, 'getWardsByProvince with empty string should return empty array');
const nullWards = getWardsByProvince(null);
assert(nullWards.length === 0, 'getWardsByProvince with null should return empty array');

const hanoiWards = getWardsByProvince('01');
assert(hanoiWards.length === 126, `Hanoi should have 126 wards, got ${hanoiWards.length}`);

// 6. Zod Schema Validation
const validData = {
  province_code: '21',
  ward_code: '50109010',
  detailed_address: 'Hội trường F - ĐH Bách Khoa',
};
const validResult = AddressSchema.safeParse(validData);
assert(validResult.success, 'Valid address data should pass schema validation');

const invalidDetailed = {
  province_code: '21',
  ward_code: '50109010',
  detailed_address: '   ',
};
assert(!AddressSchema.safeParse(invalidDetailed).success, 'Blank detailed address should fail validation');

const missingWard = {
  province_code: '21',
  ward_code: '',
  detailed_address: 'Hội trường F',
};
assert(!AddressSchema.safeParse(missingWard).success, 'Empty ward code should fail validation');

const missingProvince = {
  province_code: '',
  ward_code: '50109010',
  detailed_address: 'Hội trường F',
};
assert(!AddressSchema.safeParse(missingProvince).success, 'Empty province code should fail validation');

// 7. formatAddress
const formatted = formatAddress({
  province_code: '21',
  ward_code: '50109010',
  detailed_address: 'Hội trường F - 54 Nguyễn Lương Bằng',
});
assert(
  formatted === 'Hội trường F - 54 Nguyễn Lương Bằng, Phường Liên Chiểu, Thành phố Đà Nẵng',
  `formatAddress output mismatch: got "${formatted}"`
);

// 8. parseAddressString
const parsedStandard = parseAddressString(
  'Phòng Lab 402, Phường Liên Chiểu, Thành phố Đà Nẵng'
);
assert(parsedStandard.province_code === '21', `Parsed province code should be 21, got ${parsedStandard.province_code}`);
assert(parsedStandard.ward_code === '50109010', `Parsed ward code should be 50109010, got ${parsedStandard.ward_code}`);
assert(parsedStandard.detailed_address === 'Phòng Lab 402', `Parsed detailed should be "Phòng Lab 402", got "${parsedStandard.detailed_address}"`);

const parsedLegacy = parseAddressString('Cyber King, Hoàn Kiếm, Hà Nội');
assert(parsedLegacy.province_code === '01', `Legacy parse province should be 01, got ${parsedLegacy.province_code}`);
assert(parsedLegacy.ward_name === 'Phường Hoàn Kiếm', `Legacy parse ward should be "Phường Hoàn Kiếm", got "${parsedLegacy.ward_name}"`);

console.log('\n🎉 ALL 14 ASSERTIONS PASSED SUCCESSFULLY!');
