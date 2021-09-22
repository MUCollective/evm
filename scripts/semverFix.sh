OLD="^const {ANY} = Comparator"
NEW="// const { ANY } = Comparator \n const ANY = Symbol('SemVer ANY') "
sed -i "" "s|$OLD|$NEW|" node_modules/semver/ranges/outside.js
sed -i "" "s|$OLD|$NEW|" node_modules/semver/ranges/subset.js

OLD="^const { ANY } = Comparator"
NEW="// const { ANY } = Comparator \n const ANY = Symbol('SemVer ANY') "
sed -i "" "s|$OLD|$NEW|" node_modules/semver/ranges/outside.js
sed -i "" "s|$OLD|$NEW|" node_modules/semver/ranges/subset.js