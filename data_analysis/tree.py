import pdb

from node import Node

only_use_last_refresh = True


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

        if only_use_last_refresh:
            start_index = df.index[df['info'] == 'start, userId: {}'.format(user_id)]
            len_start_index = [start_index[i + 1] - start_index[i] if i < len(start_index) - 1 else len(df) - start_index[i]
                               for i in range(len(start_index))]
            max_len_index = max(range(len(len_start_index)), key=len_start_index.__getitem__)
            pdb.set_trace()
            if max_len_index < len(start_index) - 1:
                df = df[start_index[max_len_index]:start_index[max_len_index+1]].reset_index(drop=True)
            else:
                df = df[start_index[max_len_index]:].reset_index(drop=True)

        # if not only_use_last_refresh:
        #     self.root = Node()
        #     self.root.name = "meta"
        #     self.root.info = user_id

        for i in range(len(df)):
            if self.root is None:
                self.root = Node()
                self.root.bind_rec(df.loc[i, :])
                self.cur_node = self.root
                continue

            node_in_tree = Tree.find_node(self.root, df.loc[i, :])

            if node_in_tree:
                self.cur_node = node_in_tree
                continue

            new_node = Node()
            new_node.bind_rec(df.loc[i, :])

            if new_node.name == 'load dataset':
                self.cur_node = self.root

            if not only_use_last_refresh and new_node.name == 'start':
                self.cur_node = self.root

            self.cur_node.add_child(new_node)
            self.cur_node = new_node

    def to_obj(self):
        if self.root is None:
            return ''

        return self.root.to_obj()
