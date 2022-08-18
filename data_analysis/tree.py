import pdb

from node import Node


class Tree:
    def __init__(self):
        self.root = None
        self.cur_node = None
        self.id = None

    @staticmethod
    def find_node(cur_node, rec):
        if cur_node is None:
            return False
        if Node.compare_node_to_rec(cur_node, rec):
            return cur_node
        for child in cur_node.children:
            node_in_tree = Tree.find_node(child, rec)
            if node_in_tree:
                return node_in_tree
        return False

    def build(self, df, user_id):
        self.id = user_id
        df = df.sort_values(by=['time'], ignore_index=True)
        # pdb.set_trace()

        start_index = df.index[df['info'] == 'start, userId: {}'.format(user_id)]
        df = df[start_index[-1]:].reset_index(drop=True)

        for i in range(len(df)):
            if self.root is None:
                self.root = Node()
                self.root.bind_rec(df.loc[i, :])
                self.cur_node = self.root
                continue

            node_in_tree = Tree.find_node(self.root, df.loc[i, :])

            if not node_in_tree:
                new_node = Node()
                new_node.bind_rec(df.loc[i, :])
                self.cur_node.add_child(new_node)
                self.cur_node = new_node
                continue

            self.cur_node = node_in_tree

    def to_obj(self):
        if self.root is None:
            return ''

        return self.root.to_obj()
