from node import Node
from tree import Tree


def gen_tree(logs_dataframe):

    if 'userId' not in logs_dataframe:
        return None

    split_logs_dataframe = logs_dataframe.groupby(['userId'])

    trees = []
    for k, df in split_logs_dataframe:
        if k == '':
            continue
        tree = Tree()
        tree.build(df, k)
        trees.append(tree)

    meta_tree = Tree()
    meta_tree.id = '__meta'

    meta_tree.root = Node()
    meta_tree.root.name = "meta"
    meta_tree.root.children = [t.root for t in trees]

    return meta_tree
