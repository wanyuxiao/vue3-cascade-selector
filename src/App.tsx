import { defineComponent, ref, Ref } from 'vue';
import axios from 'axios';
import CascadeSelector, { Option, Value } from './components/CascadeSelector';

axios.interceptors.response.use(response => {
  return new Promise((resolve, reject) => {
    if (response.status === 200) {
      if (response.data?.code === '200') {
        resolve(response.data.data);
      } else {
        reject(response.data || { msg: '未知异常' });
      }
    } else {
      reject(response);
    }
  });
});
const loadProvinces = async () => {
  try {
    const options: Array<Option> = await axios.get('http://danube-topcars.stable.dasouche.net/dictionary/dictionaryAction/province.json');
    const sortedOptions = options.sort((a, b) => a.letter.localeCompare(b.letter));
    const groupedOptions: Array<{ key: string; row: Array<Option> }> = Object.values(
      sortedOptions.reduce((a: { [key: string]: { key: string; row: Array<Option> } }, c) => {
        if (!a[c.letter]) {
          a[c.letter] = { key: c.letter, row: [] };
        }
        a[c.letter].row.push({ code: c.code, name: c.name });
        return a;
      }, {}),
    );
    return [{ key: '*', row: [{ code: '*', name: '不限省份' }] }, ...groupedOptions];
  } catch (e: any) {
    console.warn(e.statusText || e.msg);
    return [];
  }
};
const loadCitiesByProvinceCode = async (proviceCode: string) => {
  try {
    const options: Array<Option> = await axios.get(
      `http://danube-topcars.stable.dasouche.net/dictionary/dictionaryAction/city.json?provinceCode=${proviceCode}`,
    );
    return [
      { key: '*', row: [{ code: `${proviceCode}-*`, name: '不限城市' }] },
      {
        key: '城市',
        row: options.map(o => ({ code: o.code, name: o.name })),
      },
    ];
  } catch (e: any) {
    console.warn(e.statusText || e.msg);
    return [];
  }
};
const loadRegionByCityCode = async (cityCode: string) => {
  try {
    const options: Array<Option> = await axios.get(
      `http://danube-topcars.stable.dasouche.net/dictionary/dictionaryAction/region.json?cityCode=${cityCode}`,
    );
    return [
      { key: '*', row: [{ code: `${cityCode}-*`, name: '不限区县' }] },
      {
        key: '区县',
        row: options.map(o => ({ code: o.code, name: o.name })),
      },
    ];
  } catch (e: any) {
    console.warn(e.statusText || e.msg);
    return [];
  }
};
export default defineComponent({
  setup() {
    const loadFns = [loadProvinces, loadCitiesByProvinceCode, loadRegionByCityCode];
    const value: Ref<Value> = ref([]);
    const confirmHandler = (_value: Value) => {
      value.value = _value;
    };
    return () => (
      <div class="App" style={{ width: '100vw', height: '100vh' }}>
        <CascadeSelector type="multi" loadFns={loadFns} initialValue={value.value} confirmHandler={confirmHandler} />
      </div>
    );
  },
});
