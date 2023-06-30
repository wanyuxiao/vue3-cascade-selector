import { computed, ComputedRef, defineComponent, onMounted, ref, Ref } from 'vue';
import './index.less';

type Nodes = Array<{ code: string; name: string; children?: Nodes }>;
type Node = { code: string; name: string; children?: Nodes };
export type Option = { code: string; name: string; [key: string]: any };
export type Value = Nodes;

const MIN_DEPTH = 1;

const CommonPopup = defineComponent({
  name: 'CommonPopup',
  props: {
    type: {
      type: String,
      required: true,
      validator: (v: string) => v === 'single' || v === 'multi',
      default: 'multi',
    },
    depth: {
      type: Number,
      required: true,
      validator: (v: number) => v >= MIN_DEPTH,
      default: MIN_DEPTH,
    },
    index: {
      type: Number,
      required: true,
      validator: (v: number) => v >= MIN_DEPTH - 1,
      default: 0,
    },
    visible: {
      type: Boolean,
      require: true,
      default: false,
    },
    options: {
      type: Array<{ key: string; row: Array<Option> }>,
      required: true,
      default: () => [],
    },
    path: {
      type: Array<{ code: string; name: string }>,
      required: true,
      default: () => [],
    },
    selectedNodes: {
      type: Array<Node>,
      required: true,
      default: () => [],
    },
    optionClickHandler: {
      type: Function,
      required: false,
    },
    backHandler: {
      type: Function,
      required: false,
    },
  },
  setup(props) {
    return () => (
      <div class={`CommonPopup ${props.visible ? 'show' : 'hide'}`}>
        {props.index > 0 && (
          <div class="title">
            <div
              class="action"
              onClick={() => {
                props.backHandler?.(props.index);
              }}>
              返回
            </div>
            {props.path[props.index - 1]?.name && <div class="text">{props.path[props.index - 1]?.name}</div>}
          </div>
        )}
        {props.options.map((g, i) => (
          <div key={i} class="group">
            <div id={g.key} class="target">
              {g.key}
            </div>
            <div class="list">
              {g.row.map(o => {
                const selected = props.selectedNodes.findIndex(n => n.code === o.code) > -1;
                const selecting = props.path.findIndex(p => p.code === o.code) > -1;
                return (
                  <div
                    key={o.code}
                    class="item"
                    onClick={() => {
                      props.optionClickHandler?.(o, props.index);
                    }}>
                    {props.type === 'multi' && props.index === props.depth - 1 && (
                      <div class={`icon ${selected ? 'selected' : 'unselected'}`} />
                    )}
                    <div class={`text ${selecting ? 'selecting' : ''} ${selected ? 'selected' : ''}`}>{o.name}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  },
});

const clearEmptyChildNodes = (nodes: Nodes): Nodes => {
  nodes.forEach(n => {
    if (Array.isArray(n.children) && n.children.length > 0) {
      n.children = clearEmptyChildNodes(n.children);
    }
  });
  return nodes.filter(n => !n.children || (Array.isArray(n.children) && n.children.length > 0));
};
const clearSiblingNodes = (nodes: Nodes, path: Array<{ code: string; name: string }>): Nodes => {
  return nodes.filter(n => {
    if (Array.isArray(n.children) && n.children.length > 0) {
      n.children = clearSiblingNodes(n.children, path);
    }
    return path.findIndex(p => p.code === n.code) > -1;
  });
};
const clear$$Nodes = (nodes: Nodes, path: Array<{ code: string; name: string }>): Nodes => {
  nodes.forEach(n => {
    if (path.findIndex(p => p.code === n.code) > -1) {
      if (Array.isArray(n.children) && n.children.length > 0) {
        n.children = clear$$Nodes(n.children, path);
      }
      nodes = nodes.filter(_n => _n.code.indexOf('*') < 0);
    }
  });
  return nodes;
};
const flattenNodes = (nodes: Nodes): Array<Node> => {
  const flattenedNodes: Array<Node> = [];
  nodes.forEach(n => {
    flattenedNodes.push(n);
    if (Array.isArray(n.children) && n.children.length > 0) {
      flattenedNodes.push(...flattenNodes(n.children));
    }
  });
  return flattenedNodes;
};

export default defineComponent({
  name: 'CascadeSelector',
  props: {
    type: {
      type: String,
      required: true,
      validator: v => v === 'single' || v === 'multi',
      default: 'multi',
    },
    loadFns: {
      type: Array<(params?: any) => Promise<Array<{ key: string; row: Array<Option> }>>>,
      required: true,
      validator: (v: Array<(params?: any) => Promise<Array<{ key: string; row: Array<Option> }>>>) => v.length >= MIN_DEPTH,
    },
    initialValue: {
      type: Array<{ code: string; name: string; children?: Nodes }>,
      required: true,
      default: () => [],
    },
    confirmHandler: {
      type: Function,
      required: false,
    },
  },
  setup(props) {
    const depth: number = props.loadFns.length;
    const indexes: Array<number> = new Array(depth).fill(0).map((_, i) => i);
    const visibles: Ref<Array<boolean>> = ref([]);
    const optionss: Ref<Array<Array<{ key: string; row: Array<Option> }>>> = ref([]);
    const path: Ref<Array<{ code: string; name: string }>> = ref([]);
    const value: Ref<Value> = ref(clearEmptyChildNodes(props.initialValue));
    const flattenedNodes: ComputedRef<Array<Node>> = computed(() => flattenNodes(value.value));
    onMounted(() => {
      (async () => {
        let index = 0;
        optionss.value[index] = await props.loadFns[index]();
        visibles.value[index] = true;
        if (props.type === 'single' && Array.isArray(props.initialValue) && props.initialValue.length > 0) {
          const init = async (node: Node) => {
            if (node.code.indexOf('*') > -1) {
              return;
            }
            index += 1;
            path.value[index - 1] = { code: node.code, name: node.name };
            optionss.value[index] = await props.loadFns[index]();
            visibles.value[index] = true;
            if (index < depth - 1 && Array.isArray(node.children) && node.children.length > 0) {
              init(node.children[0]);
            }
          };
          init(props.initialValue[0]);
        }
      })();
    });
    const select = (_path: Array<{ code: string; name: string }>) => {
      let nextNodes = [...value.value];
      /* 将 currNodes 和 nextNodes 指向同一个内存地址，currNodes 的指向在递归时发生变化 */
      let currNodes = nextNodes;
      _path.forEach((p, i) => {
        // 当前点击的选项是否已选中
        const targetNodeIndex = currNodes.findIndex(n => n.code === p.code);
        const targetNode = currNodes[targetNodeIndex];
        // 当前点击的选项已选中时，需要进一步判断当前点击的选项是否是叶子节点
        // 注意：各层级的「不限」选项是叶子节点
        if (targetNodeIndex > -1) {
          // 当前点击的选项是叶子节点时，需要进一步判断当前点击的选项是否位于最底层
          // 注意：位于非最底层的「不限」选项在多选时不能取消选择，表现与在单选时相同
          if (i === _path.length - 1) {
            // 当前点击的选项位于最底层时，需要进一步判断当前点击的选项是否为「不限」选项
            if (props.type === 'multi' && i === depth - 1) {
              // 当前点击的选项为「不限」选项时，该层已选中的选项全部取消选中
              if (targetNode.code.indexOf('*') > -1) {
                currNodes.splice(0, currNodes.length);
              } else {
                // 当前点击的选项为普通选项时，取消选中该选项
                currNodes.splice(targetNodeIndex, 1);
                // 如果该层的「不限」选项已选中，取消选中该层的「不限」选项
                const $$nodeIndex = currNodes.findIndex(n => n.code.indexOf('*') > -1);
                if ($$nodeIndex > -1) {
                  currNodes.splice($$nodeIndex, 1);
                }
              }
              // 及时清理子节点为空的节点
              nextNodes = clearEmptyChildNodes(nextNodes);
            }
          } else {
            // 当前点击的选项是非叶子节点，则下沉一级
            /* 对 targetNode.children 判空，但不能改变 currNodes 的指向，使其指向 targetNode.children 指向的内存地址 */
            targetNode.children = targetNode.children || [];
            currNodes = targetNode.children;
          }
        } else {
          // 当前点击的选项未选中时，需要进一步判断当前点击的选项是否是叶子节点
          // 注意：各层级的「不限」选项是叶子节点
          // 当前点击的选项是叶子节点时，单选和多选需要分开处理
          if (i === _path.length - 1) {
            // 单选时
            if (props.type === 'single') {
              // 选中当前点击的选项
              currNodes.push({ code: p.code, name: p.name });
              // 及时清理不在指定路径上的节点
              // 注意：单选时，选项之间是互斥的
              nextNodes = clearSiblingNodes(nextNodes, _path);
              value.value = nextNodes;
              confirmHandler();
              return;
            }
            // 多选时，需要进一步判断当前点击的选项是否位于最底层
            // 当前点击的选项位于最底层时，需要进一步判断当前点击的选项是否为「不限」选项
            if (i === depth - 1) {
              // 当前点击的选项为「不限」选项时，该层的选项全部选中
              if (p.code.indexOf('*') > -1) {
                optionss.value[i].forEach(g => {
                  g.row.forEach(o => {
                    // 注意：该层已选中的选项需要先取消选中再选中，以保证顺序与数据源的顺序同步
                    const _targetNodeIndex = currNodes.findIndex(n => n.code === o.code);
                    if (_targetNodeIndex > -1) {
                      currNodes.splice(_targetNodeIndex, 1);
                    }
                    currNodes.push({ code: o.code, name: o.name });
                  });
                });
              } else {
                // 当前点击的选项为普通选项时，选中该选项
                currNodes.push({ code: p.code, name: p.name });
                // 如果该层的选项全部选中时，选中「不限」选项
                const flattenedOptions = optionss.value[i].reduce((a: Array<Option>, c) => a.concat(c.row), []);
                const $$optionIndex = flattenedOptions.findIndex(o => o.code.indexOf('*') > -1);
                const $$option = flattenedOptions.splice($$optionIndex, 1)[0];
                if (currNodes.length === flattenedOptions.length) {
                  currNodes.push({ code: $$option.code, name: $$option.name });
                }
              }
            } else {
              // 当前点击的选项为位于非最底层的「不限」选项时，该层已选中的选项全部取消选中
              // 注意：位于非最底层的「不限」选项与该层的其它选项之间是互斥的
              currNodes.splice(0, currNodes.length);
              currNodes.push({ code: p.code, name: p.name });
            }
            // 及时清理指定路径上的「不限」选项
            nextNodes = clear$$Nodes(nextNodes, _path.slice(0, _path.length - 1));
          } else {
            /* 给 currNodes 指向的内存地址追加一个节点，访问同一个内存地址的 nextNodes 更新 */
            const node = { code: p.code, name: p.name, children: [] };
            currNodes.push(node);
            /* 将 currNodes 的指向改为 node.children 指向的内存地址 */
            currNodes = node.children;
          }
        }
      });
      value.value = nextNodes;
    };
    const optionClickHandler = async (option: Option, index: number) => {
      if (index < depth - 1) {
        visibles.value.splice(index + 1, path.value.length - index);
        optionss.value.splice(index + 1, path.value.length - index);
        path.value.splice(index, path.value.length - index);
      }
      if (index === depth - 1 || option.code.indexOf('*') > -1) {
        const _path = path.value.concat({ code: option.code, name: option.name });
        select(_path);
      } else {
        path.value = [...path.value, { code: option.code, name: option.name }];
        const options = await props.loadFns[index + 1](option.code);
        optionss.value = [...optionss.value, options];
        visibles.value = [...visibles.value, true];
      }
    };
    const backHandler = (index: number) => {
      visibles.value.splice(index, path.value.length + 1 - index);
      optionss.value.splice(index, path.value.length + 1 - index);
      path.value.splice(index - 1, path.value.length + 1 - index);
    };
    const clearHandler = () => {
      visibles.value.splice(1, path.value.length + 1 - 1);
      optionss.value.splice(1, path.value.length + 1 - 1);
      path.value.splice(0, path.value.length + 1 - 1);
      value.value = [];
    };
    const confirmHandler = () => {
      props.confirmHandler?.(value);
    };
    const scrollHandler = (key: string) => {
      const element = document.getElementById(key);
      element?.scrollIntoView({ behavior: 'smooth' });
    };
    return () => (
      <div class="CascadeSelector">
        <div class={`container ${props.type}`}>
          {indexes.map((_, i) => (
            <CommonPopup
              key={i}
              type={props.type}
              depth={depth}
              index={i}
              visible={visibles.value[i]}
              options={optionss.value[i]}
              path={path.value}
              selectedNodes={flattenedNodes.value}
              optionClickHandler={optionClickHandler}
              backHandler={backHandler}
            />
          ))}
        </div>
        <div class="anchor-bar">
          {optionss.value[0]?.map((g, i) => (
            <div
              key={i}
              class="item"
              onClick={() => {
                scrollHandler(g.key);
              }}>
              {g.key}
            </div>
          ))}
        </div>
        {props.type === 'multi' && (
          <div class="footer-bar">
            <div class="reset-button" onClick={clearHandler}>
              清空
            </div>
            <div class="confirm-button" onClick={confirmHandler}>
              确定
            </div>
          </div>
        )}
      </div>
    );
  },
});
