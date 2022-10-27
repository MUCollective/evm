import pdb
from copy import deepcopy


def serialize_set(l):
    return set([str(v) for v in l])


def serialize_list(l):
    return [str(v) for v in l]


class Node:
    def __init__(self):
        self.name = ''
        self.datasetName = None
        self.modelChecking = None
        self.modeling = None
        self.vlSpec = None
        self.dndState = None
        self.filters = None
        self.transforms = None
        self.models = None
        self.showPredictionOrResidual = None
        self.info = ''
        self.children = []

    def bind_rec(self, rec):
        self.name = rec['info'] if rec['info'].find(',') == -1 else rec['info'][:rec['info'].index(',')]
        if rec['info'].find('load dataset') != -1: # load dataset hack
            self.name = 'load dataset'
        self.name = self.name.strip()
        self.datasetName = rec['datasetName']
        self.modelChecking = rec['modelChecking']
        self.modeling = rec['modeling']
        self.vlSpec = rec['vlSpec']
        self.dndState = rec['dndState']
        self.filters = rec['filters']
        self.transforms = rec['transforms']
        self.models = rec['models']
        self.showPredictionOrResidual = rec['showPredictionOrResidual']
        self.info = rec['info']
        self.children = []

    def add_child(self, node):
        self.children.append(node)

    @staticmethod
    def compare_node_to_rec(node, rec):
        # pdb.set_trace()
        if node.datasetName != rec['datasetName']:
            return False
        if node.modelChecking != rec['modelChecking']:
            return False
        if node.modeling != rec['modeling']:
            return False
        # if node.vlSpec != rec['vlSpec']:
        #     return False
        if serialize_set(node.dndState[0]['items']) != serialize_set(rec['dndState'][0]['items']):
            return False
        if serialize_set(node.dndState[1]['items']) != serialize_set(rec['dndState'][1]['items']):
            return False
        if serialize_set(node.dndState[2]['items']) != serialize_set(rec['dndState'][2]['items']):
            return False
        if serialize_set(node.dndState[3]['items']) != serialize_set(rec['dndState'][3]['items']):
            return False
        if serialize_set(node.dndState[4]['items']) != serialize_set(rec['dndState'][4]['items']):
            return False
        if serialize_set(node.filters) != serialize_set(rec['filters']):
            return False
        if serialize_list(node.transforms) != serialize_list(rec['transforms']):
            return False
        if serialize_set(node.models) != serialize_set(rec['models']):
            return False
        if node.showPredictionOrResidual != rec['showPredictionOrResidual']:
            return False

        return True

    def to_obj(self):
        self_dump = deepcopy(self.__dict__)
        self_dump['children'] = []
        for child in self.children:
            self_dump['children'].append(child.to_obj())
        return self_dump
