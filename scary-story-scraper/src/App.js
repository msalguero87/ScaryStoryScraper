import React from 'react';
import './App.css';
import ReactWordcloud  from 'react-wordcloud';

var firebase = window.firebase;

class App extends React.Component  {
  constructor(props){
    super(props);
    this.state = {
        posts: [],
        currentPage: 1,
        filter: '',
        tags: []
    }
  }
  componentDidMount(){
    var _self = this;
    var database = firebase.database();
    var posts = [];
    var tags = [];
    database.ref('tags').once('value').then(function(snapshot) {
      snapshot.forEach(function(childSnapshot) {
        var children = [];
        var childposts = childSnapshot.child('posts').val();
        if(childposts){
          children = Object.keys(childposts);
        }
          
        tags.push({
            text: childSnapshot.key,
            value: children.length,
            children: children
        });
      });
      tags = tags.sort((a,b) => b.value - a.value).slice(0, 20);
      _self.setState({tags: tags});
      console.log(tags);
    });
    database.ref('post').once('value').then(function(snapshot) {
      snapshot.forEach(function(childSnapshot) {
        posts.push({
            key: childSnapshot.key,
            title: childSnapshot.child('title').val(),
            summary: childSnapshot.child('summary').val(), 
            author: childSnapshot.child('author').val(),
            type: childSnapshot.child('source').val(),
            link: childSnapshot.child('link').val()
        });
      });

      _self.setState({
          posts: posts.sort((a,b) => (a.title > b.title) ? 1 : ((b.title > a.title) ? -1 : 0))
      });
    }); 
  }
  changePage(page){
    this.setState({currentPage: page});
  }
  changeFilter(source){
    this.setState({filter: source, currentPage: 1});
  }
  onTagClick(tag){
    var _self = this;
    var database = firebase.database();
    var posts = [];
    console.log("clicked")
    database.ref('tags/'+tag.text+"/posts").once('value').then(function(snapshot) {
      snapshot.forEach(function(childSnapshot) {
        posts.push({
            key: childSnapshot.key,
            title: childSnapshot.child('title').val(),
            summary: childSnapshot.child('summary').val(), 
            author: childSnapshot.child('author').val(),
            type: childSnapshot.child('source').val(),
            link: childSnapshot.child('link').val()
        });
      });
      _self.setState({
          posts: posts.sort((a,b) => (a.title > b.title) ? 1 : ((b.title > a.title) ? -1 : 0))
      });
    }); 
  }
    render() {
      var posts = [];
      var _self = this;
      const statePosts = this.state.posts.filter(function(element){
        if(!_self.state.filter) return true;
        return element.type === _self.state.filter;
      });
      const pageTotal = Math.floor(statePosts.length / 5);
      const page = this.state.currentPage - 1;
      
      for (let i = (page * 5); i < statePosts.length - ((pageTotal - page - 1) * 5); i++) {
        var post = statePosts[i];
        if(!post) continue;
        posts.push(<div className="post" key={post.key}>
          <div className="col-md-2">
            <a href={post.link} className="img img-2" style={{backgroundImage: "url(/"+post.type+".png)"}}></a>
          </div>
        <div className="col-md-10 text text-2 pl-md-4">
      <h3 className="mb-2"><a href={post.link}>{post.title}</a></h3>
          <div className="meta-wrap">
            <p className="meta">
              <span><i className="icon-calendar mr-2"></i>by {post.author}</span>
            </p>
          </div>
          <p className="mb-4">{post.summary}</p>
          <p><a href={post.link} className="btn-custom" target="_blank" >Read More <span className="ion-ios-arrow-forward"></span></a></p>
        </div>
      </div>);
      }
      const pages = [];
      for (let i = 1; i < pageTotal; i++) {
        if(i === this.state.currentPage)
          pages.push(<li key={i} className="page-item active" aria-current="page">
            <a className="page-link" onClick={this.changePage.bind(this, i)}>{i} <span className="sr-only">(current)</span></a>
          </li>);
        else
          pages.push(<li key={i} className="page-item"><a className="page-link" onClick={this.changePage.bind(this, i)}>{i}</a></li>);
      }
      return (
        <div className="row" style={{marginRight: 0, marginLeft: 0}}>
          <div className="col-md-2 ">
            <h1>SCARY STORY SCRAPER</h1>
            <p>
              A place to find user-submitted scary stories from around the web.
            </p>
          <ul className="list-group list-group-flush">
            <li className="list-group-item" onClick={this.changeFilter.bind(this, "reddit")}>Reddit r/nosleep</li>
            <li className="list-group-item" onClick={this.changeFilter.bind(this, "jezebel")}>Jezebel Scary Story Contest</li>
          </ul>
          </div>
          <div className="col-md-8 posts">
            {posts}
            <nav aria-label="...">
              <ul className="pagination">
                {pages}
              </ul>
            </nav>
          </div>
          <div className="col-md-2 tags">
            <div className="row tag-search">
              <input className="form-control col-md-9" type="text" placeholder="Search..." />
              <button type="button" className="btn btn-warning offset-md-1 col-md-2">Ok</button>
            </div>
            <div style={{ height: 400, width: 232, backgroundColor: '#d9e6f6' }}>
              <ReactWordcloud 
                words={this.state.tags}
                callbacks={{
                  onWordClick: this.onTagClick.bind(this)
                }} 
              />
            </div>
          </div>
        </div>
      );
  }
}

export default App;
