import { IRuleDefinition } from '../interfaces/IRuleDefinition';
import { Flow } from '../models/Flow';
import { FlowNode } from '../models/FlowNode';
import { FlowElement } from '../models/FlowElement';
import { FlowType } from '../models/FlowType';
import { RuleResult } from '../models/RuleResult';
import { RuleCommon } from '../models/RuleCommon';
import { ResultDetails } from '../models/ResultDetails';

export class UnconnectedElements extends RuleCommon implements IRuleDefinition {

  constructor() {
    super({
      name: 'UnconnectedElements',
      label: 'Unconnected elements',
      description: 'Removing unconnected elements which are not being used by the Flow makes your Flow more efficient and maintainable.',
      type: 'pattern',
      supportedTypes: [...FlowType.backEndTypes, ...FlowType.visualTypes],
      docRefs: [],
      isConfigurable: false
    });
  }

  public execute(flow: Flow): RuleResult {
    if (flow.type[0] === 'Survey') {
      return new RuleResult(this, false);
    }
    const flowElements: FlowNode[] = flow.elements.filter(node => node instanceof FlowNode) as FlowNode[];
    let indexesToProcess = [this.findStart(flowElements)];
    const processedElementIndexes: number[] = [];
    const unconnectedElementIndexes: number[] = [];
    if (indexesToProcess[0] && indexesToProcess[0] === -1 && !flow.startElementReference) {
      throw 'Can not find starting element';
    }
    if (indexesToProcess[0] && indexesToProcess[0] === -1 && flow.startElementReference) {
      indexesToProcess = [
        flowElements.findIndex(n => {
          return n.name == flow.startElementReference[0];
        })
      ];
    }
    do {
      indexesToProcess = indexesToProcess.filter(index => !processedElementIndexes.includes(index));
      if (indexesToProcess.length > 0) {
        for (const [index, element] of flowElements.entries()) {
          if (indexesToProcess.includes(index)) {
            const references: string[] = [];
            if (element.connectors && element.connectors.length > 0) {
              for (const connector of element.connectors) {
                if (connector.reference) {
                  references.push(connector.reference);
                }
              }
            }
            if (references.length > 0) {
              const elementsByReferences = flowElements.filter(anElement => references.includes(anElement.name));
              for (const nextElement of elementsByReferences) {
                const nextIndex = flowElements.findIndex(anElement => nextElement.name === anElement.name);
                if (!processedElementIndexes.includes(nextIndex)) {
                  indexesToProcess.push(nextIndex);
                }
              }
            }
            processedElementIndexes.push(index);
          }
        }
      } else {
        for (const index of flowElements.keys()) {
          if (!processedElementIndexes.includes(index)) {
            unconnectedElementIndexes.push(index);
          }
        }
      }
    } while ((processedElementIndexes.length + unconnectedElementIndexes.length) < flowElements.length);

    const processedElements = [];
    const unconnectedElements = [];
    for (const [index, element] of flowElements.entries()) {
      if (processedElementIndexes.includes(index)) {
        processedElements.push(element);
      } else if (unconnectedElementIndexes.includes(index)) {
        unconnectedElements.push(element);
      }
    }
    let results = [];
    for (const det of unconnectedElements) {
      results.push(new ResultDetails(det));
    }
    return new RuleResult(this, unconnectedElements.length > 0, results);
  }

  private findStart(nodes: FlowElement[]) {
    return nodes.findIndex(n => {
      return n.subtype === 'start';
    });
  }


}
